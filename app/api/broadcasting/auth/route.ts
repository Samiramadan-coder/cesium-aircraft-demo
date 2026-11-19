import { NextResponse } from "next/server";

import { api } from "@/lib/api/client";
import { toErrorResponse } from "@/lib/api/route";

export const dynamic = "force-dynamic";

/**
 * Authorizes a private realtime channel (Laravel Echo / Reverb). The browser
 * can't read the auth token (httpOnly cookie), so Echo posts here and this
 * forwards the request to Laravel with the token attached.
 */
export async function POST(request: Request) {
  try {
    // Echo sends `socket_id` and `channel_name` as a form.
    const form = new URLSearchParams(await request.text());
    const signature = await api.post<unknown>("/broadcasting/auth", form, {
      skipAuthRedirect: true,
    });
    return NextResponse.json(signature);
  } catch (error) {
    return toErrorResponse(error);
  }
}
