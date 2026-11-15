import type { AlertSeverity } from "@/types/alerts";

export type AppNotification = {
  id: string;
  kind: "alert" | "notice";
  severity: AlertSeverity;
  /** Already localized by the API (currently English only). */
  message: string;
  aircraftId: string | null;
  /** Set when `kind` is "alert". */
  alertId: string | null;
  /** Epoch ms. */
  createdAt: number;
  /** Epoch ms, or null while unread. */
  readAt: number | null;
};

/** `GET /v1/notifications` */
export type Notifications = {
  data: AppNotification[];
  unreadCount: number;
};
