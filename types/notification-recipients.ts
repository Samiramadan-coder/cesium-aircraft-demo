export type NotificationChannel = "sms" | "email";

/** A row of `/v1/notification-recipients`. */
export type NotificationRecipient = {
  id: string | number;
  channel: NotificationChannel;
  name: string | null;
  /** Phone number for `sms`, address for `email`. */
  destination: string;
};

/** Body of `POST /v1/notification-recipients`. */
export type NotificationRecipientPayload = Omit<NotificationRecipient, "id">;
