import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("uses first and last words, letters only", () => {
    expect(initials("Jane Mary Doe")).toBe("JD");
    expect(initials("Test Sales (dummy)")).toBe("TD");
    expect(initials("owner")).toBe("O");
    expect(initials("  ")).toBe("?");
  });
});
