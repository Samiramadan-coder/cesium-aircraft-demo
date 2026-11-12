"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** The locale after the current one, and a function that switches to it. */
export function useLocaleToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { locales } = routing;
  const next = locales[(locales.indexOf(locale) + 1) % locales.length];

  return {
    next,
    switchLocale: () => router.replace(pathname, { locale: next }),
  };
}

/** Button labelled with the other language's name, keeping the current page. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LocaleSwitcher");
  const { next, switchLocale } = useLocaleToggle();

  return (
    <Button
      variant="ghost"
      size="sm"
      lang={next}
      title={t("hint")}
      className={cn("text-foreground-2 hover:text-foreground", className)}
      onClick={switchLocale}
    >
      <Languages data-icon="inline-start" />
      {t(`locales.${next}`)}
    </Button>
  );
}
