import { pdfResponse } from "@/lib/pdf-response";
import { getCurrentUser } from "@/lib/session";
import { renderInvoicePdf } from "@/server/pdf";

// react-pdf needs Node APIs (fs for fonts, Buffer).
export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/i;

/** GET /api/invoices/:id/pdf — view inline; add ?download=1 to save the file. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "Not found" }, { status: 404 });

  const pdf = await renderInvoicePdf(id);
  if (!pdf) return Response.json({ error: "Not found" }, { status: 404 });
  return pdfResponse(request, pdf);
}
