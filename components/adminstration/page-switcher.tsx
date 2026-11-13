"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BASE = "/adminstration";

const PAGES = [
  { key: "staff", href: BASE },
  { key: "alertRecipients", href: `${BASE}/alert-recepient` },
] as const;

export default function PageSwitcher() {
  const t = useTranslations("Adminstration");
  const pathname = usePathname();
  const router = useRouter();

  const active =
    PAGES.find((page) => page.href !== BASE && pathname.startsWith(page.href))
      ?.href ?? BASE;

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
    </div>
  );
}
