import "../globals.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDirection, routing } from "@/i18n/routing";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import {
  Big_Shoulders,
  Geist_Mono,
  Hanken_Grotesk,
  Noto_Sans_Arabic,
} from "next/font/google";

// Brand fonts: Big Shoulders for display headings, Hanken Grotesk for text.
const bigShoulders = Big_Shoulders({
  variable: "--ff-big-shoulders",
  subsets: ["latin"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--ff-hanken-grotesk",
  subsets: ["latin"],
});

// Tabular flight data (altitude, coordinates, ...).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The brand fonts have no Arabic glyphs; this is the fallback for Arabic text.
const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      className={`${bigShoulders.variable} ${hankenGrotesk.variable} ${geistMono.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
