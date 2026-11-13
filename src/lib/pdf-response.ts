/** Build a PDF HTTP response; `?download=1` on the request URL saves instead of viewing. */
export function pdfResponse(request: Request, pdf: { buffer: Buffer; filename: string }) {
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
