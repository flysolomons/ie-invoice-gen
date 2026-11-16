import { describe, expect, it } from "vitest";
import { daysBetween, dueLabel } from "./invoice-status";

describe("daysBetween", () => {
  it("counts calendar days across months and is signed", () => {
    expect(daysBetween("2026-02-27", "2026-03-01")).toBe(2);
    expect(daysBetween("2026-03-01", "2026-02-27")).toBe(-2);
    expect(daysBetween("2026-11-16", "2026-11-16")).toBe(0);
  });
});

describe("dueLabel", () => {
  it("describes time until or past the due date", () => {
    expect(dueLabel("2026-11-16", "2026-11-16")).toBe("Due today");
    expect(dueLabel("2026-11-17", "2026-11-16")).toBe("Due in 1 day");
    expect(dueLabel("2026-11-30", "2026-11-16")).toBe("Due in 14 days");
    expect(dueLabel("2026-11-15", "2026-11-16")).toBe("1 day overdue");
    expect(dueLabel("2026-11-01", "2026-11-16")).toBe("15 days overdue");
  });
});
