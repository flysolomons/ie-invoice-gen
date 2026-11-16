import { Download, FileText, Paperclip } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Panel } from "@/components/app/blocks";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
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
        back={{ href: "/expenses", label: "Expenses" }}
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

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel title="Details" className="h-fit">
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
        </Panel>

        <Panel title="Receipt" className="h-fit" bodyClassName="grid gap-3">
          {expense.fileKey ? (
            <>
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated file; next/image can't fetch it
                <img
                  src={fileUrl}
                  alt={`Receipt from ${expense.vendor}`}
                  className="max-h-96 w-full rounded-lg border bg-muted/40 object-contain"
                />
              ) : (
                <div className="grid place-items-center gap-2 rounded-lg border bg-muted/40 py-10 text-muted-foreground">
                  <FileText className="size-8" aria-hidden />
                  <span className="text-sm">PDF receipt</span>
                </div>
              )}
              <p className="truncate text-sm text-muted-foreground" title={expense.fileName ?? undefined}>
                {expense.fileName} · {formatBytes(expense.fileSize ?? 0)}
              </p>
              <div className="flex gap-2">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <FileText aria-hidden /> Open
                </a>
                <a href={`${fileUrl}?download=1`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Download aria-hidden /> Download
                </a>
              </div>
            </>
          ) : (
            <div className="grid place-items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              <Paperclip className="size-6" aria-hidden />
              No receipt attached yet. Add one in the details form.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
