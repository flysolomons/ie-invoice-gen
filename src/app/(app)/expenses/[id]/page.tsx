import { Download, FileText } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { todayInTimezone } from "@/lib/invoice-status";
import { centsToInput, formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { formatBytes } from "@/lib/uploads";
import { getExpense, listCategories } from "@/server/expenses";
import { getSettings } from "@/server/settings";
import { deleteExpense } from "../actions";
import { ExpenseForm } from "../expense-form";

export const metadata: Metadata = { title: "Expense" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function ExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [expense, categories, settings] = await Promise.all([
    getExpense(id),
    listCategories(),
    getSettings(),
  ]);
  if (!expense) notFound();

  const fileUrl = `/api/expenses/${expense.id}/file`;
  const isImage = expense.fileMime?.startsWith("image/");
  const canDelete = user.role === "owner" || expense.createdBy === user.id;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={expense.vendor}
        description={`${formatMoney(expense.amountCents, expense.currency)} on ${expense.expenseDate}`}
        actions={
          canDelete && (
            <ConfirmActionButton
              label="Delete"
              confirmLabel="Confirm delete"
              action={deleteExpense.bind(null, expense.id)}
            />
          )
        }
      />

      <section className="grid gap-3" aria-labelledby="receipt-heading">
        <h2 id="receipt-heading" className="font-medium">
          Receipt
        </h2>
        {expense.fileKey ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {expense.fileName} ({formatBytes(expense.fileSize ?? 0)})
              </span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <FileText className="size-4" aria-hidden /> Open
              </a>
              <a
                href={`${fileUrl}?download=1`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Download className="size-4" aria-hidden /> Download
              </a>
            </div>
            {isImage && (
              // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated file; next/image can't fetch it
              <img
                src={fileUrl}
                alt={`Receipt from ${expense.vendor}`}
                className="max-h-96 w-fit max-w-full rounded-lg border object-contain"
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No receipt attached. Add one below.</p>
        )}
      </section>

      <Separator />

      <section className="grid gap-3">
        <h2 className="font-medium">Details</h2>
        <ExpenseForm
          id={expense.id}
          categories={categories}
          today={todayInTimezone(settings.timezone)}
          currentFile={
            expense.fileKey ? { name: expense.fileName ?? "receipt", size: expense.fileSize ?? 0 } : null
          }
          defaults={{
            vendor: expense.vendor,
            categoryId: expense.categoryId ?? "",
            amount: centsToInput(expense.amountCents),
            currency: expense.currency,
            expenseDate: expense.expenseDate,
            notes: expense.notes ?? "",
          }}
        />
      </section>
    </div>
  );
}
