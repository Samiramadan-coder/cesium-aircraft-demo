"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type {
  TrackerDetails,
  TrackerHealth,
  TrackerPayload,
} from "@/types/trackers";

export async function addTracker(
  payload: TrackerPayload,
): Promise<ActionResult<unknown>> {
  const result = await runAction(() =>
    api.post<unknown>("/v1/tracking/trackers", payload),
  );
  // The table and the KPIs both change.
  if (result.ok) revalidatePath("/[locale]/(main)/trackers", "page");
  return result;
}

export async function getTracker(
  trackerId: string,
): Promise<ActionResult<TrackerDetails>> {
  return runAction(() =>
    api.get<TrackerDetails>(
      `/v1/tracking/trackers/${encodeURIComponent(trackerId)}`,
    ),
  );
}

export async function getTrackerHealth(
  trackerId: string,
): Promise<ActionResult<TrackerHealth>> {
  return runAction(() =>
    api.get<TrackerHealth>(
      `/v1/tracking/trackers/${encodeURIComponent(trackerId)}/health`,
    ),
  );
}

export async function deleteTracker(
  trackerId: string,
): Promise<ActionResult<unknown>> {
  const result = await runAction(() =>
    api.delete<unknown>(
      `/v1/tracking/trackers/${encodeURIComponent(trackerId)}`,
    ),
  );
  // The table and the KPIs both change.
  if (result.ok) revalidatePath("/[locale]/(main)/trackers", "page");
  return result;
}

export async function updateTracker(
  trackerId: string,
  payload: Partial<TrackerPayload>,
): Promise<ActionResult<unknown>> {
  const result = await runAction(() =>
    api.patch<unknown>(
      `/v1/tracking/trackers/${encodeURIComponent(trackerId)}`,
      payload,
    ),
  );
  // The table and the KPIs both change.
  if (result.ok) revalidatePath("/[locale]/(main)/trackers", "page");
  return result;
}
