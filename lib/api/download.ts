import "server-only";

import { api } from "./client";
import { ApiError, NetworkError } from "./errors";

/**
 * Streams a file from the API to the browser as a download. Route handlers
 * use it because the browser can't call the API itself: the auth token
 * lives server-side.
 */
export async function proxyDownload(
  path: string,
  fallback: { filename: string; contentType: string },
): Promise<Response> {
  try {
    const file = await api.get(path, {
      responseType: "stream",
      // Generating a file (a PDF especially) can take a while.
      timeout: 60_000,
    });

    const filename = file.filename ?? fallback.filename;

    return new Response(file.data, {
      headers: {
        "Content-Type": file.contentType ?? fallback.contentType,
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
