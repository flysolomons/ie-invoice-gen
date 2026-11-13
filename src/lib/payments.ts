export const PAYMENT_METHODS = ["bank_transfer", "card", "cash", "cheque", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  card: "Card",
  cash: "Cash",
  cheque: "Cheque",
  other: "Other",
};

/** Invoice status implied by how much has been paid. */
export function statusForPaid(paidCents: number, totalCents: number) {
  if (paidCents <= 0) return "sent" as const;
  return paidCents >= totalCents ? ("paid" as const) : ("partially_paid" as const);
}
