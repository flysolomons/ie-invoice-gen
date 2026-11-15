import { describe, expect, it } from "vitest";
import { clientIp, describeUserAgent, normaliseEmail } from "./sign-in-context";

describe("clientIp", () => {
  it("prefers x-real-ip, then the first x-forwarded-for hop", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe(
      "1.1.1.1",
    );
    expect(clientIp(new Headers({ "x-forwarded-for": " 2.2.2.2 , 3.3.3.3" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers())).toBeNull();
  });
});

describe("normaliseEmail", () => {
  it("lowercases, trims and caps length", () => {
    expect(normaliseEmail("  Jane@Example.COM ")).toBe("jane@example.com");
    expect(normaliseEmail("a".repeat(500))).toHaveLength(254);
    expect(normaliseEmail("")).toBeNull();
    expect(normaliseEmail(null)).toBeNull();
  });
});

describe("describeUserAgent", () => {
  it("names common browsers and platforms", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0",
      ),
    ).toBe("Edge on Windows");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iOS");
    expect(describeUserAgent("curl/8.0")).toBe("Other device");
    expect(describeUserAgent(null)).toBe("Unknown device");
  });
});
