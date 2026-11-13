import { api } from "@/lib/api/client";
import { ApiError, NetworkError } from "@/lib/api/errors";

const FORMATS = {
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
} as const;

type Format = keyof typeof FORMATS;

/**
 * Streams the flights export from the API. The browser can't call the API
 * itself because the auth token lives server-side.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/flights/export/[format]">,
) {
  const { format } = await params;
  if (!(format in FORMATS)) return new Response(null, { status: 404 });

  try {
    const file = await api.get(`/v1/tracking/flights/export.${format}`, {
      responseType: "stream",
      // Generating a PDF can take a while.
      timeout: 60_000,
    });

    const filename = file.filename ?? `flights.${format}`;

    return new Response(file.data, {
      headers: {
        "Content-Type": file.contentType ?? FORMATS[format as Format],
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return new Response(error.message, { status: error.status });
    }
    if (error instanceof NetworkError) {
      return new Response(error.message, { status: 502 });
    }
    throw error;
  }
}
