import { describe, expect, it } from "vitest";
import { allocate, calculateInvoice, quantityToMilli } from "./invoice-calc";
import { addDays, effectiveStatus, todayInTimezone } from "./invoice-status";
import { centsToInput, percentToBp, toCents } from "./money";

describe("money", () => {
  it("parses decimal input to cents without float error", () => {
    expect(toCents("0.1")).toBe(10);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents("1,234.5")).toBe(123450);
    expect(toCents("12")).toBe(1200);
    expect(toCents("1.234")).toBeNull();
    expect(toCents("-5")).toBeNull();
    expect(toCents("abc")).toBeNull();
  });

  it("round-trips cents to input strings", () => {
    expect(centsToInput(123456)).toBe("1234.56");
    expect(centsToInput(5)).toBe("0.05");
  });

  it("converts percentages to basis points", () => {
    expect(percentToBp("15")).toBe(1500);
    expect(percentToBp("7.5")).toBe(750);
    expect(percentToBp("101")).toBeNull();
  });
});

describe("quantityToMilli", () => {
  it("handles up to 3 decimals", () => {
    expect(quantityToMilli("1.5")).toBe(1500);
    expect(quantityToMilli("0.333")).toBe(333);
    expect(quantityToMilli("2")).toBe(2000);
    expect(quantityToMilli("1.2345")).toBeNull();
  });
});

describe("allocate", () => {
  it("splits exactly, giving leftovers to the largest remainders", () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(10, [0, 5, 5])).toEqual([0, 5, 5]);
    expect(allocate(0, [3, 4])).toEqual([0, 0]);
  });
});

describe("calculateInvoice", () => {
  it("computes a simple invoice with per-line tax", () => {
    const r = calculateInvoice({
      items: [
        { quantity: "2", unitPriceCents: 5000, taxRateBp: 1000 }, // 100.00 @ 10%
        { quantity: "1.5", unitPriceCents: 3333, taxRateBp: 0 }, // 49.995 → 50.00
      ],
      discountType: "none",
      discountValue: 0,
    });
    expect(r.lines.map((l) => l.lineSubtotalCents)).toEqual([10000, 5000]);
    expect(r.subtotalCents).toBe(15000);
    expect(r.taxCents).toBe(1000);
    expect(r.totalCents).toBe(16000);
  });

  it("applies a percent discount before tax", () => {
    const r = calculateInvoice({
      items: [{ quantity: 1, unitPriceCents: 10000, taxRateBp: 2000 }],
      discountType: "percent",
      discountValue: 1000, // 10%
    });
    expect(r.discountCents).toBe(1000);
    expect(r.taxCents).toBe(1800); // 20% of 90.00
    expect(r.totalCents).toBe(10800);
  });

  it("caps a fixed discount at the subtotal and keeps totals consistent", () => {
    const r = calculateInvoice({
      items: [
        { quantity: 1, unitPriceCents: 1000, taxRateBp: 1500 },
        { quantity: 1, unitPriceCents: 2000, taxRateBp: 0 },
      ],
      discountType: "fixed",
      discountValue: 999_999,
    });
    expect(r.discountCents).toBe(3000);
    expect(r.taxCents).toBe(0);
    expect(r.totalCents).toBe(0);
  });

  it("always satisfies total = subtotal − discount + Σ line tax", () => {
    for (let n = 0; n < 200; n++) {
      const items = Array.from({ length: 1 + (n % 5) }, (_, i) => ({
        quantity: ((n * 7 + i * 13) % 5000) / 1000,
        unitPriceCents: (n * 997 + i * 31) % 100000,
        taxRateBp: (n * 37 + i) % 2500,
      }));
      const r = calculateInvoice({ items, discountType: "percent", discountValue: (n * 11) % 10000 });
      const lineDisc = r.lines.reduce((s, l) => s + l.lineDiscountCents, 0);
      expect(lineDisc).toBe(r.discountCents);
      expect(r.totalCents).toBe(r.subtotalCents - r.discountCents + r.taxCents);
      expect(r.totalCents).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("invoice status", () => {
  it("derives overdue only for open invoices past due", () => {
    expect(effectiveStatus({ status: "sent", dueDate: "2026-01-01" }, "2026-01-02")).toBe("overdue");
    expect(effectiveStatus({ status: "partially_paid", dueDate: "2026-01-01" }, "2026-01-02")).toBe(
      "overdue",
    );
    expect(effectiveStatus({ status: "sent", dueDate: "2026-01-02" }, "2026-01-02")).toBe("sent");
    expect(effectiveStatus({ status: "paid", dueDate: "2026-01-01" }, "2026-01-02")).toBe("paid");
    expect(effectiveStatus({ status: "draft", dueDate: "2026-01-01" }, "2026-01-02")).toBe("draft");
  });

  it("computes today in a timezone and adds days", () => {
    const now = new Date("2026-03-01T23:30:00Z");
    expect(todayInTimezone("UTC", now)).toBe("2026-03-01");
    expect(todayInTimezone("Pacific/Auckland", now)).toBe("2026-03-02");
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
  });
});
