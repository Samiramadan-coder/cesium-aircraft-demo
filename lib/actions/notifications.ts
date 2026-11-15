"use server";

import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";

export async function markAllNotificationsRead(): Promise<
  ActionResult<unknown>
> {
  return runAction(() => api.post<unknown>("/v1/notifications/read-all"));
}
