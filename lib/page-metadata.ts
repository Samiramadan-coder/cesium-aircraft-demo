import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import type { NavItem } from "@/constants/navigation";

/** `generateMetadata` for a sidebar page: its title is the nav label. */
export function navPageMetadata(page: NavItem["key"]) {
  return async ({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> => {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) return {};
    const t = await getTranslations({ locale, namespace: "Navigation" });
    return { title: t(`items.${page}`) };
  };
}
