"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type {
  Aerodrome,
  AerodromePayload,
  TrackingSettings,
  TrackingSettingsPayload,
  ZonePayload,
} from "@/types/tracking";

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

/** Makes an older version the current one (saved as a new version). */
export async function restoreZoneVersion(
  zoneId: string,
  versionId: string,
): Promise<ActionResult<unknown>> {
  return mutate(() =>
    api.post<unknown>(
      `${zonePath(zoneId)}/versions/${encodeURIComponent(versionId)}/restore`,
      {},
    ),
  );
}

/** Club-wide tracking settings, shown under the zones table. */
export async function updateTrackingSettings(
  payload: TrackingSettingsPayload,
): Promise<ActionResult<TrackingSettings>> {
  return mutate(() =>
    api.put<TrackingSettings>("/v1/tracking/settings", payload),
  );
}

/** The home aerodrome; only its name is editable. */
export async function updateAerodrome(
  payload: AerodromePayload,
): Promise<ActionResult<Aerodrome>> {
  return mutate(() => api.put<Aerodrome>("/v1/aerodrome", payload));
}
