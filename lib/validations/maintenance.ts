import { z } from "zod";

export type MaintenanceErrorKey =
  | "aircraftRequired"
  | "typeRequired"
  | "engineerRequired"
  | "notesTooLong";

/** Takes a translator for `EngineHours.logMaintenanceDialog.errors`. */
export function createMaintenanceSchema(
  t: (key: MaintenanceErrorKey) => string,
) {
  return z.object({
    aircraftId: z.string().min(1, t("aircraftRequired")),
    type: z.string().min(1, t("typeRequired")),
    engineer: z.string().min(1, t("engineerRequired")),
    notes: z.string().trim().max(1000, t("notesTooLong")),
  });
}

export type MaintenanceValues = z.infer<
  ReturnType<typeof createMaintenanceSchema>
>;
