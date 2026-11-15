"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type { PilotPayload, TrackedPilot } from "@/types/tracking";

/**
 * Runs a change and, when it succeeds, refreshes every page under (main):
 * pilots also show on the aircraft, map, alerts and hours pages.
 */
async function mutate<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  const result = await runAction(fn);
  if (result.ok) revalidatePath("/[locale]/(main)", "layout");
  return result;
}

/** `/v1/pilots/{id}` */
function pilotPath(pilotId: string) {
  return `/v1/pilots/${encodeURIComponent(pilotId)}`;
}

export async function addPilot(
  payload: PilotPayload,
): Promise<ActionResult<TrackedPilot>> {
  return mutate(() => api.post<TrackedPilot>("/v1/pilots", payload));
}

/** The id can't change after creation, so it isn't sent. */
export async function updatePilot(
  pilotId: string,
  payload: Omit<PilotPayload, "id">,
): Promise<ActionResult<TrackedPilot>> {
  return mutate(() => api.patch<TrackedPilot>(pilotPath(pilotId), payload));
}

export async function deletePilot(
  pilotId: string,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.delete<unknown>(pilotPath(pilotId)));
}
