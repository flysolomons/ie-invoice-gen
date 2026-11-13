import { describe, expect, it } from "vitest";
import { statusForPaid } from "./payments";
import { paymentSchema } from "./validation";

describe("statusForPaid", () => {
  it("maps paid amount to invoice status", () => {
    expect(statusForPaid(0, 10000)).toBe("sent");
    expect(statusForPaid(1, 10000)).toBe("partially_paid");
    expect(statusForPaid(9999, 10000)).toBe("partially_paid");
    expect(statusForPaid(10000, 10000)).toBe("paid");
  });
});

describe("paymentSchema", () => {
  it("parses amounts to cents and rejects zero or bad input", () => {
    const ok = paymentSchema.safeParse({ amount: "120.50", paidAt: "2026-11-13", method: "card", reference: "" });
    expect(ok.success && ok.data.amount).toBe(12050);
    expect(ok.success && ok.data.reference).toBeNull();
    expect(paymentSchema.safeParse({ amount: "0", paidAt: "2026-11-13", method: "card", reference: "" }).success).toBe(false);
    expect(paymentSchema.safeParse({ amount: "12", paidAt: "2026-11-13", method: "bitcoin", reference: "" }).success).toBe(false);
  });
});
