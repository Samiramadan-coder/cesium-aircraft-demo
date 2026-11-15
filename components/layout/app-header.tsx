"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePathname } from "@/i18n/navigation";
import type { CurrentUser } from "@/types/user";
import type { AirportWeather } from "@/types/weather";
import { UserMenu } from "@/components/layout/user-menu";
import { LocaleSwitcher } from "@/components/common/locale-switcher";
import { WeatherBadge } from "@/components/layout/weather-badge";
import { NotificationsMenu } from "@/components/notifications/notifications-menu";
import { NAV_ITEMS, PROFILE_PATH, isActiveHref } from "@/constants/navigation";

type AppHeaderProps = {
  user: CurrentUser;
  weather: AirportWeather;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
};

export function AppHeader({
  user,
  weather,
  sidebarOpen,
  onOpenSidebar,
}: AppHeaderProps) {
  const t = useTranslations("Navigation");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => isActiveHref(pathname, item.href));
  const title = current
    ? t(`items.${current.key}`)
    : isActiveHref(pathname, PROFILE_PATH)
      ? tHeader("profile")
      : null;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={t("open")}
        aria-controls="app-sidebar"
        aria-expanded={sidebarOpen}
        onClick={onOpenSidebar}
      >
        <Menu />
      </Button>

      <h1 className="min-w-0 flex-1 truncate font-big-shoulders text-lg font-bold tracking-wide uppercase rtl:text-xl rtl:tracking-normal">
        {title}
      </h1>

      <div className="flex items-center gap-1 sm:gap-2">
        <WeatherBadge weather={weather} />

        <NotificationsMenu />
        <LocaleSwitcher iconOnly />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
