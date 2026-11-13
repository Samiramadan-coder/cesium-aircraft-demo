"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type {
  FirmwareCheck,
  FirmwareVersionPayload,
  HealthPoint,
  TrackerDetails,
  TrackerLinkPayload,
  TrackerPayload,
} from "@/types/trackers";

/** `/v1/tracking/trackers/{id}` plus an optional sub-path. */
function trackerPath(trackerId: string, suffix = "") {
  return `/v1/tracking/trackers/${encodeURIComponent(trackerId)}${suffix}`;
}

/**
 * Runs a change and, when it succeeds, refreshes the trackers page — the
 * table, the KPIs and the firmware lists all come from the server.
 */
async function mutate<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  const result = await runAction(fn);
  if (result.ok) revalidatePath("/[locale]/(main)/trackers", "page");
  return result;
}

// Reads (used by the sheet and the edit form)

export async function getTracker(
  trackerId: string,
): Promise<ActionResult<TrackerDetails>> {
  return runAction(() => api.get<TrackerDetails>(trackerPath(trackerId)));
}

export async function getTrackerHealth(
  trackerId: string,
): Promise<ActionResult<HealthPoint[]>> {
  return runAction(() =>
    api.get<HealthPoint[]>(trackerPath(trackerId, "/health")),
  );
}

// Tracker CRUD

export async function addTracker(
  payload: TrackerPayload,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.post<unknown>("/v1/tracking/trackers", payload));
}

export async function updateTracker(
  trackerId: string,
  payload: Partial<TrackerPayload>,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.patch<unknown>(trackerPath(trackerId), payload));
}

export async function deleteTracker(
  trackerId: string,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.delete<unknown>(trackerPath(trackerId)));
}

// Row actions

export async function linkTracker(
  trackerId: string,
  payload: TrackerLinkPayload,
): Promise<ActionResult<unknown>> {
  return mutate(() =>
    api.post<unknown>(trackerPath(trackerId, "/link"), payload),
  );
}

export async function unlinkTracker(
  trackerId: string,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.post<unknown>(trackerPath(trackerId, "/unlink"), {}));
}

/** Doesn't change any stored data, so the page isn't refreshed. */
export async function sendTestPing(
  trackerId: string,
): Promise<ActionResult<unknown>> {
  return runAction(() =>
    api.post<unknown>(trackerPath(trackerId, "/test-ping"), {}),
  );
}

export async function checkFirmware(
  trackerId: string,
): Promise<ActionResult<FirmwareCheck>> {
  return mutate(() =>
    api.post<FirmwareCheck>(trackerPath(trackerId, "/firmware/check"), {}),
  );
}

// Firmware versions

export async function saveFirmwareVersion(
  payload: FirmwareVersionPayload,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.post<unknown>("/v1/firmware-versions", payload));
}
