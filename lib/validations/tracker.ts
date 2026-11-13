import { z } from "zod";

export type TrackerErrorKey =
  | "imeiRequired"
  | "imeiInvalid"
  | "modelRequired"
  | "serialRequired"
  | "simRequired"
  | "simNumberRequired"
  | "simNumberInvalid"
  | "apnRequired"
  | "powerSourceRequired"
  | "engineInputRequired"
  | "installedByRequired";

/** Takes a translator for `Trackers.addDialog.errors`. */
export function createTrackerSchema(t: (key: TrackerErrorKey) => string) {
  return z.object({
    imei: z
      .string()
      .trim()
      .min(1, t("imeiRequired"))
      .regex(/^\d{15}$/, t("imeiInvalid")),
    model: z.string().min(1, t("modelRequired")),
    serial: z.string().trim().min(1, t("serialRequired")),
    sim: z.string().min(1, t("simRequired")),
    simNumber: z
      .string()
      .trim()
      .min(1, t("simNumberRequired"))
      .regex(/^\+?[\d\s-]{7,20}$/, t("simNumberInvalid")),
    apn: z.string().trim().min(1, t("apnRequired")),
    powerSource: z.string().min(1, t("powerSourceRequired")),
    engineInput: z.string().min(1, t("engineInputRequired")),
    installedBy: z.string().trim().min(1, t("installedByRequired")),
    registerInTraccar: z.boolean(),
  });
}

export type TrackerValues = z.infer<ReturnType<typeof createTrackerSchema>>;
