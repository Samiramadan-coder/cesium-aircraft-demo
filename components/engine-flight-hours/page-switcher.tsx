"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MaintenanceAircraftOption } from "@/types/engine-flight-hours";
import { DailyLogSearch, MaintenanceFilters, PeriodFilter } from "./filters";

const BASE = "/engine-hours";

const PAGES = [
  { key: "fleet", href: BASE },
  { key: "pilots", href: `${BASE}/pilots` },
  { key: "dailyLog", href: `${BASE}/daily-log` },
  { key: "maintenance", href: `${BASE}/maintenance` },
] as const;

// Kept when switching tabs; each tab's own filters are not.
const SHARED_PARAMS = ["period", "from", "to"];

export default function PageSwitcher({
  maintenanceAircraft,
}: {
  maintenanceAircraft: MaintenanceAircraftOption[];
}) {
  const t = useTranslations("EngineHours");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const active =
    PAGES.find(
      (page) => page.href !== BASE && pathname.startsWith(page.href),
    ) ?? PAGES[0];

  function open(href: string) {
    const shared = new URLSearchParams();
    for (const key of SHARED_PARAMS) {
      const value = searchParams.get(key);
      if (value) shared.set(key, value);
    }
    const query = shared.toString();
    router.push(query ? `${href}?${query}` : href);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={active.href} onValueChange={(href) => open(href as string)}>
        <TabsList className="bg-card ring-1 ring-border">
          {PAGES.map((page) => (
            <TabsTrigger
              key={page.key}
              value={page.href}
              className="px-2.5 text-muted hover:text-foreground data-active:bg-card-2 data-active:text-foreground"
            >
              {t(`pages.${page.key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        {active.key === "dailyLog" && <DailyLogSearch />}
        {active.key === "maintenance" && (
          <MaintenanceFilters aircraft={maintenanceAircraft} />
        )}
        <PeriodFilter />
      </div>
    </div>
  );
}
