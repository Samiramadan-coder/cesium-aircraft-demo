import { proxyDownload } from "@/lib/api/download";

/** One flight's route as KML (opens in Google Earth). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/flights/[id]/kml">,
) {
  const { id } = await params;

  return proxyDownload(
    `/v1/tracking/flights/${encodeURIComponent(id)}/export.kml`,
    {
      filename: `${id}.kml`,
      contentType: "application/vnd.google-earth.kml+xml",
    },
  );
}
