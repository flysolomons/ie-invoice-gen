/**
 * Creates the owner account (in Neon Auth), links it as an owner in `members`,
 * and inserts the business settings row and default expense categories.
 *   npm run seed
 * Reads SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD / SEED_OWNER_NAME from .env.local.
 * Safe to re-run: if the account already exists it signs in to find its id.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

type AuthResponse = { user?: { id: string; email: string; name: string }; message?: string };

/** Call the Neon Auth (Better Auth) REST API directly; no Next.js request context here. */
async function authPost(path: string, body: Record<string, string>) {
  const base = process.env.NEON_AUTH_BASE_URL!.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: process.env.APP_URL ?? "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as AuthResponse };
}

async function getOrCreateAuthUser(email: string, password: string, name: string) {
  const signUp = await authPost("/sign-up/email", { email, password, name });
  if (signUp.ok && signUp.data.user) return { user: signUp.data.user, created: true };

  const signIn = await authPost("/sign-in/email", { email, password });
  if (signIn.ok && signIn.data.user) return { user: signIn.data.user, created: false };

  throw new Error(
    `Could not create or sign in ${email}: ` +
      `sign-up ${signUp.status} ${signUp.data.message ?? ""}; sign-in ${signIn.status} ${signIn.data.message ?? ""}`,
  );
}

async function main() {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;
  const name = process.env.SEED_OWNER_NAME || "Owner";
  if (!email || !password) {
    throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD in .env.local");
  }
  if (password.length < 8) throw new Error("SEED_OWNER_PASSWORD must be at least 8 characters");

  // Imported after dotenv so env validation sees the variables.
  const { db } = await import("../src/db");
  const { businessSettings, expenseCategories, members } = await import("../src/db/schema");

  await db.insert(businessSettings).values({ id: 1 }).onConflictDoNothing();
  await db
    .insert(expenseCategories)
    .values(
      ["Travel", "Meals", "Software", "Office", "Equipment", "Utilities", "Other"].map((n) => ({
        name: n,
      })),
    )
    .onConflictDoNothing();

  const { user, created } = await getOrCreateAuthUser(email, password, name);
  await db
    .insert(members)
    .values({ authUserId: user.id, email, name: user.name || name, role: "owner" })
    .onConflictDoUpdate({ target: members.authUserId, set: { role: "owner" } });

  console.log(`${created ? "Created" : "Found"} Neon Auth user ${email}; linked as owner.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
