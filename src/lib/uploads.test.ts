import { describe, expect, it } from "vitest";
import { detectFileType, formatBytes } from "./uploads";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

describe("detectFileType", () => {
  it("recognises allowed types by their signature", () => {
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(
      detectFileType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)),
    ).toBe("image/webp");
    expect(detectFileType(new TextEncoder().encode("%PDF-1.7\n"))).toBe("application/pdf");
  });

  it("rejects anything else, whatever its name", () => {
    expect(detectFileType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectFileType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectFileType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20))).toBeNull(); // AVI
    expect(detectFileType(new Uint8Array())).toBeNull();
  });

  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(4 * 1024 * 1024)).toBe("4.0 MB");
  });
});
