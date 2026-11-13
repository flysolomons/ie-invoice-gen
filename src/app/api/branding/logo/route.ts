import { getLogo } from "@/server/settings";

// Reads the logo from storage (fs or Vercel Blob), so it needs the Node runtime.
export const runtime = "nodejs";

/**
 * GET /api/branding/logo — PUBLIC (no sign-in), so the login page can show
 * the business logo. It serves only the logo, which getLogo() guarantees is a
 * PNG or JPEG (never SVG/HTML), so it can't carry scripts.
 */
export async function GET() {
  const logo = await getLogo();
  if (!logo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.mime,
      // Callers use /api/branding/logo?v=<storage key>; a new upload gets a new key/URL.
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
