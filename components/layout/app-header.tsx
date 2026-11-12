"use client";

import { Bell, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { usePathname } from "@/i18n/navigation";
import { NAV_ITEMS, isActiveHref } from "@/constants/navigation";

type AppHeaderProps = {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
};

export function AppHeader({ sidebarOpen, onOpenSidebar }: AppHeaderProps) {
  const t = useTranslations("Navigation");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => isActiveHref(pathname, item.href));

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

      <h1 className="min-w-0 flex-1 truncate font-big-shoulders text-2xl leading-none font-bold tracking-wide uppercase rtl:text-xl rtl:tracking-normal">
        {current ? t(`items.${current.key}`) : null}
      </h1>

      <div className="flex items-center gap-1">
        <LocaleSwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground-2 hover:text-foreground"
          aria-label={tHeader("notifications")}
          title={tHeader("notifications")}
        >
          <Bell />
        </Button>
      </div>
    </header>
  );
}
