import { NextResponse } from "next/server";

import {
  toLivePositions,
  type LivePositions,
} from "@/lib/aircraft/live-tracking";
import { api } from "@/lib/api/client";
import { toErrorResponse } from "@/lib/api/route";
import type { LiveTrackingSnapshot } from "@/types/tracking";

export const dynamic = "force-dynamic";

/**
 * Latest position of every aircraft, polled by the live map until the
 * backend offers a WebSocket feed.
 */
export async function GET() {
  try {
    const snapshot = await api.get<LiveTrackingSnapshot>("/v1/tracking/live", {
      skipAuthRedirect: true,
      cache: "no-store",
    });
    return NextResponse.json<LivePositions>(toLivePositions(snapshot));
  } catch (error) {
    return toErrorResponse(error);
  }
}
