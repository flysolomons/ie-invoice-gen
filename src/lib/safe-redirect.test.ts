import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/payments")).toBe("/payments");
    expect(safeRedirectPath("/invoices?status=paid#top")).toBe("/invoices?status=paid#top");
  });

  it("rejects anything that could leave the site", () => {
    for (const bad of [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "evil.com",
      "",
      undefined,
      ["/payments"],
    ]) {
      expect(safeRedirectPath(bad)).toBe("/dashboard");
    }
  });
});
