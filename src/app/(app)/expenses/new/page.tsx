import type { Metadata } from "next";
import { Panel } from "@/components/app/blocks";
import { PageHeader } from "@/components/app/page-header";
import { todayInTimezone } from "@/lib/invoice-status";
import { requireUser } from "@/lib/session";
import { listCategories } from "@/server/expenses";
import { getSettings } from "@/server/settings";
import { ExpenseForm } from "../expense-form";

export const metadata: Metadata = { title: "New expense" };

export default async function NewExpensePage() {
  await requireUser();
  const [settings, categories] = await Promise.all([
    getSettings(),
    listCategories(),
  ]);
  const today = todayInTimezone(settings.timezone);

  return (
    <div className="grid gap-6">
      <PageHeader
        back={{ href: "/expenses", label: "Expenses" }}
        title="New expense"
        description="Record a business expense and attach its receipt."
      />
      <Panel title="Expense details" className="max-w-3xl">
        <ExpenseForm
          id={null}
          categories={categories}
          currentFile={null}
          today={today}
          defaults={{
            vendor: "",
            categoryId: "",
            amount: "",
            currency: settings.defaultCurrency,
            expenseDate: today,
            notes: "",
          }}
        />
      </Panel>
    </div>
  );
}
