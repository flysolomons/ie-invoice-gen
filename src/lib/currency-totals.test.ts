import { describe, expect, it } from "vitest";
import { orderTotals } from "./currency-totals";

describe("orderTotals", () => {
  it("puts the default currency first and sorts the rest", () => {
    expect(
      orderTotals(
        [
          { currency: "USD", cents: 500 },
          { currency: "SBD", cents: 100 },
          { currency: "AUD", cents: 200 },
        ],
        "SBD",
      ).map((t) => t.currency),
    ).toEqual(["SBD", "AUD", "USD"]);
  });

  it("always shows the default currency, and drops other zero totals", () => {
    expect(orderTotals([{ currency: "USD", cents: 0 }], "SBD")).toEqual([
      { currency: "SBD", cents: 0 },
    ]);
    expect(orderTotals([], "USD")).toEqual([{ currency: "USD", cents: 0 }]);
  });
});
