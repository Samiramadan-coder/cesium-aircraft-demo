"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type { AircraftPayload, TrackedAircraft } from "@/types/tracking";

/**
 * Runs a change and, when it succeeds, refreshes every page under (main):
 * aircraft also show on the map, trackers, hours and alerts pages.
 */
async function mutate<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  const result = await runAction(fn);
  if (result.ok) revalidatePath("/[locale]/(main)", "layout");
  return result;
}

/** `/v1/aircraft/{id}` */
function aircraftPath(aircraftId: string) {
  return `/v1/aircraft/${encodeURIComponent(aircraftId)}`;
}

export async function addAircraft(
  payload: AircraftPayload,
): Promise<ActionResult<TrackedAircraft>> {
  return mutate(() => api.post<TrackedAircraft>("/v1/aircraft", payload));
}

/** The id can't change after creation, so it isn't sent. */
export async function updateAircraft(
  aircraftId: string,
  payload: Omit<AircraftPayload, "id">,
): Promise<ActionResult<TrackedAircraft>> {
  return mutate(() =>
    api.patch<TrackedAircraft>(aircraftPath(aircraftId), payload),
  );
}

/**
 * `POST /v1/aircraft/{id}/photo` with the image in a `photo` field. Separate
 * from the details, so the form calls it after the aircraft is saved.
 */
export async function uploadAircraftPhoto(
  aircraftId: string,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const photo = formData.get("photo");
  if (!(photo instanceof Blob)) {
    return { ok: false, message: "No photo selected." };
  }

  const body = new FormData();
  body.append("photo", photo);
  return mutate(() =>
    api.post<unknown>(`${aircraftPath(aircraftId)}/photo`, body),
  );
}

export async function deleteAircraft(
  aircraftId: string,
): Promise<ActionResult<unknown>> {
  return mutate(() => api.delete<unknown>(aircraftPath(aircraftId)));
}
