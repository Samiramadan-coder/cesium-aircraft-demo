"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type {
  FirmwareCheck,
  FirmwareVersionPayload,
  TrackerDetails,
  HealthPoint,
  TrackerLinkPayload,
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
): Promise<ActionResult<HealthPoint[]>> {
  return runAction(() =>
    api.get<HealthPoint[]>(
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

export async function sendTestPing(
  trackerId: string,
): Promise<ActionResult<unknown>> {
  return runAction(() =>
    api.post<unknown>(
      `/v1/tracking/trackers/${encodeURIComponent(trackerId)}/test-ping`,
      {},
    ),
  );
}

export async function checkFirmware(
  trackerId: string,
): Promise<ActionResult<FirmwareCheck>> {
  const result = await runAction(() =>
    api.post<FirmwareCheck>(
      `/v1/tracking/trackers/${encodeURIComponent(trackerId)}/firmware/check`,
      {},
    ),
  );
  // The table's firmware column and the "outdated" KPI may change.
  if (result.ok) revalidatePath("/[locale]/(main)/trackers", "page");
  return result;
}

export async function linkTracker(
  trackerId: string,
  payload: TrackerLinkPayload,
): Promise<ActionResult<unknown>> {
  const result = await runAction(() =>
    api.post<unknown>(
      `/v1/tracking/trackers/${encodeURIComponent(trackerId)}/link`,
      payload,
    ),
  );
  // The aircraft column, status and KPIs all change.
  if (result.ok) revalidatePath("/[locale]/(main)/trackers", "page");
  return result;
}

export async function unlinkTracker(
  trackerId: string,
): Promise<ActionResult<unknown>> {
  const result = await runAction(() =>
    api.post<unknown>(
      `/v1/tracking/trackers/${encodeURIComponent(trackerId)}/unlink`,
      {},
    ),
  );
  // The aircraft column, status and KPIs all change.
  if (result.ok) revalidatePath("/[locale]/(main)/trackers", "page");
  return result;
}

export async function saveFirmwareVersion(
  payload: FirmwareVersionPayload,
): Promise<ActionResult<unknown>> {
  const result = await runAction(() =>
    api.post<unknown>("/v1/firmware-versions", payload),
  );
  // The firmware column, the "outdated" KPI and the model lists all change.
  if (result.ok) revalidatePath("/[locale]/(main)/trackers", "page");
  return result;
}
