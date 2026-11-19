"use client";

import { MapPin, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Toaster, toast } from "sonner";
import { cn } from "cn";

import { SEVERITY_ICON } from "@/components/notifications/notifications-menu";
import { playNotificationSound } from "@/components/notifications/notification-sound";
import { useRouter } from "@/i18n/navigation";
import { getDirection } from "@/i18n/routing";
import type { AppNotification } from "@/types/notifications";

/** How long a toast stays, by severity; critical ones stay longest. */
const DURATION_MS: Record<AppNotification["severity"], number> = {
  critical: 12_000,
  warning: 8_000,
  info: 5_000,
};

/** Pops up a new notification (with its sound); the bell keeps it too. */
export function showNotificationToast(item: AppNotification) {
  playNotificationSound(item.severity);
  toast.custom((id) => <NotificationToast id={id} item={item} />, {
    id: item.id, // the same notification twice shows once
    duration: DURATION_MS[item.severity] ?? DURATION_MS.info,
  });
}

function NotificationToast({
  id,
  item,
}: {
  id: string | number;
  item: AppNotification;
}) {
  const t = useTranslations("Header");
  const router = useRouter();
  const { Icon, className } =
    SEVERITY_ICON[item.severity] ?? SEVERITY_ICON.warning;

  return (
    <div
      role={item.severity === "critical" ? "alert" : "status"}
      className={cn(
        "flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border bg-card p-3 text-foreground shadow-lg",
        item.severity === "critical" ? "border-danger/60" : "border-border",
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", className)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.message}</p>
        {item.aircraftId && (
          <button
            type="button"
            onClick={() => {
              toast.dismiss(id);
              router.push({
                pathname: "/",
                query: { aircraft: item.aircraftId! },
              });
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-card-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <MapPin className="size-3.5" aria-hidden />
            {t("showOnMap")}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(id)}
        aria-label={t("dismiss")}
        className="grid size-6 shrink-0 place-items-center rounded-md text-foreground-2 hover:bg-card-2 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Where notification toasts appear; once, in the app layout. */
export function NotificationToaster() {
  const dir = getDirection(useLocale());
  return (
    <Toaster
      dir={dir}
      // Bottom corner on the reading-end side, clear of the map's panels.
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      offset={{ bottom: 40 }}
      // Listed, not stacked: a critical one mustn't hide behind a newer one.
      expand
      visibleToasts={4}
    />
  );
}
