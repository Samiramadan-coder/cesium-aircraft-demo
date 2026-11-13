"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type { TrackerDetails, TrackerPayload } from "@/types/trackers";

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
