import { z } from "zod";

export const NOTIFICATION_CHANNELS = ["sms", "email"] as const;

const PHONE = /^\+?[\d\s-]{7,20}$/;

export type NotificationRecipientErrorKey =
  | "destinationRequired"
  | "phoneInvalid"
  | "emailInvalid";

/** Takes a translator for `AlertRecipients.addDialog.errors`. */
export function createNotificationRecipientSchema(
  t: (key: NotificationRecipientErrorKey) => string,
) {
  return z
    .object({
      channel: z.enum(NOTIFICATION_CHANNELS),
      name: z.string().trim(),
      destination: z.string().trim().min(1, t("destinationRequired")),
    })
    .superRefine((values, ctx) => {
      if (!values.destination) return;
      const valid =
        values.channel === "email"
          ? z.email().safeParse(values.destination).success
          : PHONE.test(values.destination);
      if (!valid) {
        ctx.addIssue({
          code: "custom",
          path: ["destination"],
          message: t(values.channel === "email" ? "emailInvalid" : "phoneInvalid"),
        });
      }
    });
}

export type NotificationRecipientValues = z.infer<
  ReturnType<typeof createNotificationRecipientSchema>
>;
