import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/server/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getSettings();
  const isOwner = user.role === "owner";

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Business settings</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "These details appear on every invoice and receipt."
            : "Only the account owner can change these settings."}
        </p>
      </div>
      <SettingsForm
        readOnly={!isOwner}
        defaults={{
          name: settings.name,
          email: settings.email ?? "",
          phone: settings.phone ?? "",
          address: settings.address ?? "",
          taxId: settings.taxId ?? "",
          defaultCurrency: settings.defaultCurrency,
          defaultTaxRate: String(settings.defaultTaxRateBp / 100),
          defaultPaymentTermsDays: String(settings.defaultPaymentTermsDays),
          timezone: settings.timezone,
          invoicePrefix: settings.invoicePrefix,
          receiptPrefix: settings.receiptPrefix,
          emailFromName: settings.emailFromName ?? "",
          footerNotes: settings.footerNotes ?? "",
        }}
      />
    </div>
  );
}
