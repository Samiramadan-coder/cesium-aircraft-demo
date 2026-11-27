"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRealtimeStatus } from "@/components/realtime/realtime-provider";

/**
 * Tells the operator that live updates are down (Reverb unreachable): the map
 * and alerts then come from polling, so they arrive a few seconds late.
 * Nothing shows while connected, connecting, or when realtime isn't set up.
 */
export function RealtimeIndicator() {
  const t = useTranslations("Header");
  const status = useRealtimeStatus();
  if (status !== "offline") return null;

  return (
    <div
      role="status"
      title={t("realtimeOfflineHint")}
      className="flex h-9 items-center gap-2 rounded-full border border-danger/50 bg-danger/10 px-2.5 text-sm font-medium text-danger sm:px-3.5"
    >
      <WifiOff className="size-4.5 shrink-0" aria-hidden />
      <span className="hidden sm:inline">{t("realtimeOffline")}</span>
      <span className="sr-only sm:hidden">{t("realtimeOffline")}</span>
    </div>
  );
}
