import { use } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { hasLocale, useTranslations, type Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "LoginPage" });
  return { title: t("metaTitle") };
}

export default function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations("LoginPage");

  return (
    <div className="grid min-h-svh bg-background text-foreground lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-e border-border bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[56px_56px] opacity-40 mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 size-130 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        />

        <div />

        <div className="relative flex flex-col items-center gap-10 text-center">
          <div className="relative w-full max-w-md">
            <Image
              src="/brand/logo.png"
              alt={t("logoAlt")}
              width={1536}
              height={813}
              priority
              className="relative h-auto w-full drop-shadow-[0_10px_40px_rgba(227,165,90,0.25)]"
            />
          </div>
          <p className="max-w-sm text-lg leading-relaxed text-foreground-2">
            {t("tagline")}
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-xs text-muted">
          <span className="h-px w-8 bg-primary/60" />
          <span className="font-big-shoulders text-sm tracking-[0.2em] uppercase rtl:tracking-normal">
            {t("station")}
          </span>
        </div>
      </aside>

      {/* Form panel */}
      <section className="relative flex flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between lg:justify-end">
          <Image
            src="/brand/logo.png"
            alt={t("logoAlt")}
            width={1536}
            height={813}
            priority
            className="h-12 w-auto lg:hidden"
          />
          <LocaleSwitcher />
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col gap-3">
              <span className="h-1 w-10 rounded-full bg-primary" />
              <h1 className="font-big-shoulders text-5xl leading-none font-bold tracking-wide uppercase rtl:text-4xl rtl:tracking-normal">
                {t("title")}
              </h1>
              <p className="text-sm leading-relaxed text-foreground-2">
                {t("subtitle")}
              </p>
            </div>

            <LoginForm />

            <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
              <ShieldCheck className="size-4 text-success" />
              {t("secure")}
            </p>
          </div>
        </div>

        <footer className="text-center text-xs text-muted/70">
          {t("copyright", { year: new Date().getFullYear() })}
        </footer>
      </section>
    </div>
  );
}
