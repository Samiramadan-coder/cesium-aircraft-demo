import { z } from "zod";
import { ALERT_CHANNELS } from "@/types/alerts";

export type TrackingSettingsErrorKey =
  | "numberRequired"
  | "wholeNumber"
  | "positive"
  | "recipientsRequired";

/** Takes a translator for `Zones.settings.errors`. */
export function createTrackingSettingsSchema(
  t: (key: TrackingSettingsErrorKey) => string,
) {
  const positiveInt = () =>
    z
      .number({ error: t("numberRequired") })
      .int(t("wholeNumber"))
      .positive(t("positive"));

  return z.object({
    signalLossTimeoutSec: positiveInt(),
    flightDetectionSpeedKt: positiveInt(),
    alertRecipients: z
      .array(z.enum(ALERT_CHANNELS))
      .min(1, t("recipientsRequired")),
  });
}

export type TrackingSettingsValues = z.infer<
  ReturnType<typeof createTrackingSettingsSchema>
>;
