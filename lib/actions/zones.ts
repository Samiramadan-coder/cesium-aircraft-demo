"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type { ZonePayload } from "@/types/tracking";

/** Runs a change and, when it succeeds, refreshes the zones list and map pages. */
async function mutate<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  const result = await runAction(fn);
  if (result.ok) revalidatePath("/[locale]/(main)/zones", "layout");
  return result;
}

export async function addZone(
  payload: ZonePayload,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.post<unknown>("/v1/tracking/zones", payload));
}

/** `/v1/tracking/zones/{id}` */
function zonePath(zoneId: string) {
  return `/v1/tracking/zones/${encodeURIComponent(zoneId)}`;
}

export async function updateZone(
  zoneId: string,
  payload: ZonePayload,
): Promise<ActionResult<unknown>> {
  return mutate(() =>
    api.patch<unknown>(zonePath(zoneId), payload),
  );
}

export async function deleteZone(
  zoneId: string,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.delete<unknown>(zonePath(zoneId)));
}
