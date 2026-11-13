import { getCurrentUser } from "@/lib/session";
import { getLogo } from "@/server/settings";

export const runtime = "nodejs";

/** GET /api/settings/logo — the business logo, for the Settings preview (members only). */
export async function GET() {
  if (!(await getCurrentUser())) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  const logo = await getLogo();
  if (!logo) return Response.json({ error: "No logo" }, { status: 404 });
  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
