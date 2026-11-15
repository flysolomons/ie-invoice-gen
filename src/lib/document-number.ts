import { z } from "zod";

/**
 * Invoice / receipt numbers. Owners can amend them to match an outside system
 * (airline, GDS or accounting document numbers), so free text is allowed, but
 * only characters that are safe in file names and HTTP headers.
 */
export type DocKind = "invoice" | "receipt";

export const DOC_NUMBER_MAX = 40;
export const AMEND_REASON_MAX = 200;

export const amendNumberSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, "Enter a number")
    .max(DOC_NUMBER_MAX, `${DOC_NUMBER_MAX} characters at most`)
    .regex(/^[A-Za-z0-9 ./_-]+$/, "Use letters, digits, spaces and - / . _ only")
    .refine((v) => !/\s{2,}/.test(v), "No double spaces"),
  reason: z
    .string()
    .trim()
    .max(AMEND_REASON_MAX, `${AMEND_REASON_MAX} characters at most`)
    .transform((v) => v || null),
});

/**
 * Find the first free auto number from `start` upwards. `isTaken` says whether
 * a candidate is already used or reserved (e.g. an owner amended a document to
 * "INV-0050" before the counter got there). Throws rather than loop forever.
 */
export async function pickFreeNumber(
  start: number,
  format: (n: number) => string,
  isTaken: (candidate: string) => Promise<boolean>,
  maxSkips = 1000,
): Promise<{ n: number; number: string }> {
  for (let n = start; n <= start + maxSkips; n++) {
    const number = format(n);
    if (!(await isTaken(number))) return { n, number };
  }
  throw new Error(`No free document number within ${maxSkips} of ${start}`);
}

/** File name safe for Content-Disposition: "618/2401 23" → "618-2401-23". */
export function safeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[.-]+/, "") || "document";
}

/** Escape LIKE wildcards so a search for "INV_1" matches only that text. */
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}
