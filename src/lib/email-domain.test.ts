import { describe, expect, it } from "vitest";
import { emailDomain, isAllowedDomain } from "./email-domain";

const ALLOWED = ["flysolomons.com", "flysolomons.com.sb"];

describe("isAllowedDomain", () => {
  it("accepts exact company domains, case-insensitively", () => {
    expect(isAllowedDomain("jane@flysolomons.com", ALLOWED)).toBe(true);
    expect(isAllowedDomain("John.Doe@FlySolomons.com.SB", ALLOWED)).toBe(true);
  });

  it("rejects look-alike and sub/super domains", () => {
    for (const email of [
      "x@evil-flysolomons.com",
      "x@flysolomons.com.attacker.io",
      "x@mail.flysolomons.com",
      "x@flysolomons.co",
      "flysolomons.com",
      "@flysolomons.com",
      "",
    ]) {
      expect(isAllowedDomain(email, ALLOWED)).toBe(false);
    }
  });

  it("allows nothing when no domains are configured", () => {
    expect(isAllowedDomain("jane@flysolomons.com", [])).toBe(false);
  });

  it("extracts the domain after the last @", () => {
    expect(emailDomain("a@b@Example.COM")).toBe("example.com");
  });
});
