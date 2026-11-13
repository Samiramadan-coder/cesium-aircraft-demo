"use server";

import { api } from "@/lib/api/client";
import { runAction, type ActionResult } from "@/lib/api/errors";
import type { AircraftHoursDetails } from "@/types/engine-flight-hours";

export async function getAircraftHours(
  aircraftId: string,
): Promise<ActionResult<AircraftHoursDetails>> {
  return runAction(() =>
    api.get<AircraftHoursDetails>(
      `/v1/tracking/hours/aircraft/${encodeURIComponent(aircraftId)}`,
    ),
  );
}
