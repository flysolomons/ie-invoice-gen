import { z } from "zod";

/**
 * Server-side environment, validated once at import time so a missing
 * variable fails loudly instead of producing confusing runtime errors.
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  NEON_AUTH_BASE_URL: z.string().url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  APP_URL: z.string().url().default("http://localhost:3000"),
  EMAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
  EMAIL_FROM: z.string().default("Invoices <invoices@example.com>"),
  /** Defaults to vercel-blob when BLOB_READ_WRITE_TOKEN is set, else local. */
  STORAGE_DRIVER: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["local", "vercel-blob"]).optional()),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export const env = schema.parse(process.env);
