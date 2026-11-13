import { z } from "zod";

export type TrackerLinkErrorKey = "aircraftRequired" | "installedByRequired";

/** Takes a translator for `Trackers.linkDialog.errors`. */
export function createTrackerLinkSchema(
  t: (key: TrackerLinkErrorKey) => string,
) {
  return z.object({
    aircraftId: z.string().min(1, t("aircraftRequired")),
    installedBy: z.string().min(1, t("installedByRequired")),
  });
}

export type TrackerLinkValues = z.infer<
  ReturnType<typeof createTrackerLinkSchema>
>;
