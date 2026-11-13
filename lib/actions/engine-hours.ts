"use server";

import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import { revalidatePath } from "next/cache";
import type {
  AircraftHoursDetails,
  MaintenanceRecordPayload,
} from "@/types/engine-flight-hours";

export async function getAircraftHours(
  aircraftId: string,
): Promise<ActionResult<AircraftHoursDetails>> {
  return runAction(() =>
    api.get<AircraftHoursDetails>(
      `/v1/tracking/hours/aircraft/${encodeURIComponent(aircraftId)}`,
    ),
  );
}

export async function logMaintenance(
  payload: MaintenanceRecordPayload,
): Promise<ActionResult<unknown>> {
  const result = await runAction(() =>
    api.post<unknown>("/v1/tracking/maintenance", payload),
  );
  // Hours, service status and KPIs all change; refresh the whole section.
  if (result.ok) {
    revalidatePath("/[locale]/(main)/engine-hours/(hours)", "layout");
  }
  return result;
}
