import { proxyDownload } from "@/lib/api/download";

const FORMATS: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
};

/** The flight history export (CSV or PDF). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/flights/export/[format]">,
) {
  const { format } = await params;
  if (!Object.hasOwn(FORMATS, format)) {
    return new Response(null, { status: 404 });
  }

  return proxyDownload(`/v1/tracking/flights/export.${format}`, {
    filename: `flights.${format}`,
    contentType: FORMATS[format],
  });
}
