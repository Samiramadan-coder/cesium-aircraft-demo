"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_SECTIONS, isActiveHref } from "@/constants/navigation";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  /** Mobile only: whether the off-canvas sidebar is shown. */
  open: boolean;
  onClose: () => void;
};

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="app-sidebar"
        className={cn(
          "fixed inset-y-0 inset-s-0 z-50 flex w-64 flex-col border-e border-border bg-card transition-transform duration-200",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Link href="/" onClick={onClose} className="flex items-center">
            <Image
              src="/brand/logo.png"
              alt={t("logoAlt")}
              width={1536}
              height={813}
              priority
              className="h-10 w-auto"
            />
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label={t("close")}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.key} className="flex flex-col gap-1">
              <p className="mb-2 px-3 font-big-shoulders text-xs tracking-[0.2em] text-muted uppercase rtl:tracking-normal">
                {t(`sections.${section.key}`)}
              </p>
              {section.items.map(({ key, href, icon: Icon }) => {
                const active = isActiveHref(pathname, href);
                return (
                  <Link
                    key={key}
                    href={href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/12 font-medium text-primary"
                        : "text-foreground-2 hover:bg-card-2 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 inset-s-0 w-0.5 rounded-full bg-primary" />
                    )}
                    <Icon className="size-4 shrink-0" />
                    {t(`items.${key}`)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border px-4 py-3 text-[0.7rem] text-muted/70">
          {t("station")}
        </div>
      </aside>
    </>
  );
}
