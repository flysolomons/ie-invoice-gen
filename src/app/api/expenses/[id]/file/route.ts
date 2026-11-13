import { getCurrentUser } from "@/lib/session";
import { getExpense } from "@/server/expenses";
import { getStorage } from "@/server/storage";

export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * GET /api/expenses/:id/file — streams the receipt to signed-in members only.
 * Looked up by expense id (never by a raw storage key), served with the type we
 * detected at upload; ?download=1 saves instead of viewing.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const expense = await getExpense(id);
  if (!expense?.fileKey || !expense.fileMime) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const file = await getStorage().get(expense.fileKey);
  if (!file) return Response.json({ error: "File missing" }, { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  // RFC 5987 encoding so non-ASCII file names don't break the header.
  const name = encodeURIComponent(expense.fileName ?? "receipt");
  return new Response(file.body, {
    headers: {
      "Content-Type": expense.fileMime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Uploaded content must never run scripts in our origin.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
