import { z } from "zod";

export type FirmwareVersionErrorKey =
  "modelRequired" | "versionRequired" | "versionInvalid";

/** Takes a translator for `Trackers.firmwareVersions.errors`. */
export function createFirmwareVersionSchema(
  t: (key: FirmwareVersionErrorKey) => string,
) {
  return z.object({
    model: z.string().trim().min(1, t("modelRequired")),
    latestVersion: z
      .string()
      .trim()
      .min(1, t("versionRequired"))
      // e.g. 03.29.09
      .regex(/^\d+(\.\d+)+$/, t("versionInvalid")),
  });
}

export type FirmwareVersionValues = z.infer<
  ReturnType<typeof createFirmwareVersionSchema>
>;
