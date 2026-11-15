"use client";

import { Menu } from "@base-ui/react/menu";
import { Bell, CheckCheck, CircleAlert, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { cn } from "cn";
import { useNotifications } from "@/components/notifications/notifications-provider";
import type { AppNotification } from "@/types/notifications";

const SEVERITY_ICON = {
  critical: { Icon: CircleAlert, className: "text-danger" },
  warning: { Icon: TriangleAlert, className: "text-primary" },
  info: { Icon: Info, className: "text-foreground-2" },
} as const;

/** Bell with an unread dot; opens the latest notifications. */
export function NotificationsMenu() {
  const t = useTranslations("Header");
  const { items, unreadCount, markAllRead, markingAllRead } = useNotifications();
  const hasUnread = unreadCount > 0;
  const label = hasUnread
    ? t("notificationsUnread", { count: unreadCount })
    : t("notifications");

  return (
    <Menu.Root>
      <Menu.Trigger
        className="relative grid size-10 place-items-center rounded-lg text-foreground-2 outline-none transition-colors hover:bg-card-2 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-card-2 data-popup-open:text-foreground"
        aria-label={label}
        title={label}
      >
        <Bell className="size-5" aria-hidden />
        {hasUnread && (
          <span
            className="absolute inset-e-2 top-1.5 size-2.5 rounded-full bg-red-500 ring-2 ring-card"
            aria-hidden
          />
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" collisionPadding={16} className="z-50">
          <Menu.Popup className="flex max-h-[min(32rem,var(--available-height))] w-[min(24rem,calc(100vw-2rem))] origin-(--transform-origin) flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl shadow-black/40 outline-none transition-[transform,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">{t("notifications")}</span>
              <Menu.Item
                closeOnClick={false}
                disabled={!hasUnread || markingAllRead}
                onClick={markAllRead}
                className="flex cursor-default items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary outline-none select-none data-disabled:opacity-50 data-highlighted:bg-card-2 [&_svg]:size-3.5"
              >
                {markingAllRead ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <CheckCheck aria-hidden />
                )}
                {t("markAllRead")}
              </Menu.Item>
            </div>

            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                {t("noNotifications")}
              </p>
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto p-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <NotificationRow item={item} />
                  </li>
                ))}
              </ul>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function NotificationRow({ item }: { item: AppNotification }) {
  const t = useTranslations("Header");
  const format = useFormatter();
  // Re-renders every minute so "2 min ago" stays right while the menu is open
  const now = useNow({ updateInterval: 60_000 });
  const { Icon, className } = SEVERITY_ICON[item.severity] ?? SEVERITY_ICON.warning;
  const unread = item.readAt === null;

  return (
    <Menu.Item
      closeOnClick={false}
      className="flex cursor-default items-start gap-3 rounded-lg px-3 py-2.5 outline-none select-none data-highlighted:bg-card-2"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", className)} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm", unread ? "font-medium" : "text-foreground-2")}>
          {item.message}
        </span>
        <time
          dateTime={new Date(item.createdAt).toISOString()}
          title={format.dateTime(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}
          className="mt-0.5 block text-xs text-muted"
        >
          {format.relativeTime(item.createdAt, now)}
        </time>
      </span>
      {unread && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
          <span className="sr-only">{t("unread")}</span>
        </span>
      )}
    </Menu.Item>
  );
}
