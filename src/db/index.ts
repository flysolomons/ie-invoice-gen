import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Neon (production / Vercel): WebSocket Pool driver.
 * Anything else (local Docker Postgres): node-postgres.
 * Both support interactive transactions, which we need for gap-free
 * invoice/receipt numbering and payment row locks.
 */
const isNeon = new URL(env.DATABASE_URL).hostname.endsWith(".neon.tech");

function createDb() {
  if (isNeon) {
    neonConfig.webSocketConstructor = ws;
    return drizzleNeon({ client: new NeonPool({ connectionString: env.DATABASE_URL }), schema });
  }
  // Cast so both branches share one type; the query API is identical.
  return drizzlePg({
    client: new PgPool({ connectionString: env.DATABASE_URL }),
    schema,
  }) as unknown as ReturnType<typeof drizzleNeon<typeof schema>>;
}

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };
export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
