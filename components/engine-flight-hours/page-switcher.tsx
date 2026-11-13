"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BASE = "/engine-hours";

const PAGES = [
  { key: "fleet", href: BASE },
  { key: "pilots", href: `${BASE}/pilots` },
  { key: "dailyLog", href: `${BASE}/daily-log` },
  { key: "maintenance", href: `${BASE}/maintainance` },
] as const;

const PERIODS = [
  "last30Days",
  "thisWeek",
  "thisMonth",
  "allTime",
  "custom",
] as const;

type Period = (typeof PERIODS)[number];

export default function PageSwitcher() {
  const t = useTranslations("EngineHours");
  const pathname = usePathname();
  const router = useRouter();

  // TODO: move to the URL with nuqs.
  const [period, setPeriod] = useState<Period>("last30Days");

  const active =
    PAGES.find((page) => page.href !== BASE && pathname.startsWith(page.href))
      ?.href ?? BASE;

  const periodItems = PERIODS.map((value) => ({
    value,
    label: t(`periods.${value}`),
  }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs
        value={active}
        onValueChange={(href) => router.push(href as string)}
      >
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

      <Select
        items={periodItems}
        value={period}
        onValueChange={(value) => value && setPeriod(value as Period)}
      >
        <SelectTrigger className="w-40 border-border bg-card text-foreground hover:bg-card-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card text-foreground ring-border">
          {periodItems.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className="focus:bg-card-2 focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground"
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
