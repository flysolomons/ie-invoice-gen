import { describe, expect, it } from "vitest";
import { amendNumberSchema, escapeLike, pickFreeNumber, safeFilename } from "./document-number";

const parse = (number: string, reason = "") => amendNumberSchema.safeParse({ number, reason });

describe("amendNumberSchema", () => {
  it("accepts airline and accounting style numbers, trimmed", () => {
    for (const n of ["INV-0007", "618-2401234567", "AB 12/3.4_5", "x".repeat(40)]) {
      expect(parse(n).success).toBe(true);
    }
    expect(parse("  618-2401234567 ").data?.number).toBe("618-2401234567");
  });

  it("rejects empty, too long, unsafe characters and double spaces", () => {
    for (const n of ["", "   ", "x".repeat(41), 'a"b', "a\\b", "a;b", "a\nb", "é1", "50%", "A  1"]) {
      expect(parse(n).success).toBe(false);
    }
  });

  it("turns a blank reason into null", () => {
    expect(parse("INV-1", "  ").data?.reason).toBeNull();
    expect(parse("INV-1", " Matches GDS ").data?.reason).toBe("Matches GDS");
  });
});

describe("pickFreeNumber", () => {
  const format = (n: number) => `INV-${String(n).padStart(4, "0")}`;

  it("returns the start number when it is free", async () => {
    expect(await pickFreeNumber(7, format, async () => false)).toEqual({ n: 7, number: "INV-0007" });
  });

  it("skips numbers that are taken or reserved, checking each once in order", async () => {
    const taken = new Set(["INV-0003", "INV-0004"]);
    const checked: string[] = [];
    const result = await pickFreeNumber(3, format, async (c) => {
      checked.push(c);
      return taken.has(c);
    });
    expect(result).toEqual({ n: 5, number: "INV-0005" });
    expect(checked).toEqual(["INV-0003", "INV-0004", "INV-0005"]);
  });

  it("gives up instead of looping forever", async () => {
    await expect(pickFreeNumber(1, format, async () => true, 5)).rejects.toThrow();
  });
});

describe("safeFilename", () => {
  it("replaces path separators, spaces and quotes", () => {
    expect(safeFilename("618/2401 23.pdf")).toBe("618-2401-23.pdf");
    expect(safeFilename('a"b\\c.pdf')).toBe("a-b-c.pdf");
    expect(safeFilename("../x.pdf")).toBe("x.pdf");
    expect(safeFilename("///")).toBe("document");
  });
});

describe("escapeLike", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLike("INV_1 50%")).toBe("INV\\_1 50\\%");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });
});
