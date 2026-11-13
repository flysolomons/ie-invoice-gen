"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { expenseCategories, expenses } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { ALLOWED_UPLOADS, detectFileType, formatBytes, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { expenseSchema, issuesToFieldErrors } from "@/lib/validation";
import { getStorage } from "@/server/storage";

export type ExpenseFormState = {
  errors?: Record<string, string>;
  values?: Record<string, string>;
} | null;

const FIELDS = ["vendor", "categoryId", "newCategory", "amount", "currency", "expenseDate", "notes"];

type Upload = { key: string; name: string; mime: string; size: number; data: Buffer };

/** Validate the uploaded file by size and by its actual bytes. */
async function readUpload(file: FormDataEntryValue | null): Promise<Upload | { error: string } | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `File is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.` };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const mime = detectFileType(data);
  if (!mime) return { error: "Upload a JPG, PNG, WebP image or a PDF." };
  const year = new Date().getUTCFullYear();
  return {
    key: `expenses/${year}/${randomUUID()}.${ALLOWED_UPLOADS[mime]}`,
    name: file.name.slice(0, 200) || `receipt.${ALLOWED_UPLOADS[mime]}`,
    mime,
    size: file.size,
    data,
  };
}

async function resolveCategory(categoryId: string, newCategory: string): Promise<string | null> {
  if (newCategory) {
    await db.insert(expenseCategories).values({ name: newCategory }).onConflictDoNothing();
    const [row] = await db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(eq(expenseCategories.name, newCategory));
    return row.id;
  }
  return categoryId || null;
}

/** Create (id = null) or update an expense, optionally attaching/replacing/removing its receipt file. */
export async function saveExpense(
  id: string | null,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const user = await requireUser();
  const values = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));

  const parsed = expenseSchema.safeParse(values);
  if (!parsed.success) return { errors: issuesToFieldErrors(parsed.error), values };

  const upload = await readUpload(formData.get("file"));
  if (upload && "error" in upload) return { errors: { file: upload.error }, values };
  const removeFile = formData.get("removeFile") === "on";

  const existing = id
    ? (await db.select({ fileKey: expenses.fileKey }).from(expenses).where(eq(expenses.id, id)))[0]
    : null;
  if (id && !existing) return { errors: { _form: "Expense not found." }, values };

  const storage = getStorage();
  if (upload) await storage.put(upload.key, upload.data, upload.mime);

  const { categoryId, newCategory, amount, ...rest } = parsed.data;
  const fileFields = upload
    ? { fileKey: upload.key, fileName: upload.name, fileMime: upload.mime, fileSize: upload.size }
    : removeFile
      ? { fileKey: null, fileName: null, fileMime: null, fileSize: null }
      : {};

  let expenseId = id;
  try {
    const row = {
      ...rest,
      amountCents: amount,
      categoryId: await resolveCategory(categoryId, newCategory),
      ...fileFields,
    };
    if (id) {
      await db.update(expenses).set(row).where(eq(expenses.id, id));
    } else {
      const [created] = await db
        .insert(expenses)
        .values({ ...row, createdBy: user.id })
        .returning({ id: expenses.id });
      expenseId = created.id;
    }
  } catch (e) {
    // Don't leave an orphaned file behind if the database write failed.
    if (upload) await storage.delete(upload.key).catch(() => {});
    throw e;
  }

  // The old file is no longer referenced once replaced or removed.
  if (existing?.fileKey && (upload || removeFile)) {
    await storage.delete(existing.fileKey).catch((e) => console.error("Failed to delete old file", e));
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect(`/expenses/${expenseId}`);
}

/** Delete an expense and its file. Allowed for the owner or whoever created it. */
export async function deleteExpense(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const [row] = await db
    .select({ fileKey: expenses.fileKey, createdBy: expenses.createdBy })
    .from(expenses)
    .where(eq(expenses.id, id));
  if (!row) return { error: "Expense not found." };
  if (user.role !== "owner" && row.createdBy !== user.id) {
    return { error: "Only the owner or the person who added it can delete this expense." };
  }
  await db.delete(expenses).where(eq(expenses.id, id));
  if (row.fileKey) {
    await getStorage()
      .delete(row.fileKey)
      .catch((e) => console.error("Failed to delete file", e));
  }
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect("/expenses");
}
