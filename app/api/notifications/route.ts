import { NextResponse } from "next/server";

import { api } from "@/lib/api/client";
import { toErrorResponse } from "@/lib/api/route";
import type { Notifications } from "@/types/notifications";

export const dynamic = "force-dynamic";

/**
 * The user's latest notifications, polled by the RealtimeProvider while
 * Reverb is unreachable (and fetched once after it reconnects) so new alerts
 * still toast.
 */
export async function GET() {
  try {
    const notifications = await api.get<Notifications>("/v1/notifications", {
      skipAuthRedirect: true,
      cache: "no-store",
    });
    return NextResponse.json<Notifications>(notifications);
  } catch (error) {
    return toErrorResponse(error);
  }
}
