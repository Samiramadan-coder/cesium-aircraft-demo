import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Check, Mail, ShieldCheck, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { initials } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import type { CurrentUser } from "@/types/user";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/profile">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Header" });
  return { title: t("profile") };
}

const PERMISSION_KEYS = [
  "manageFleet",
  "manageOperations",
  "manageMaintenance",
  "manageUsers",
] as const;

const cardClass = "rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5";

export default async function Page() {
  const [user, t, tHeader, tStaff] = await Promise.all([
    api.get<CurrentUser>("/v1/auth/me"),
    getTranslations("Profile"),
    getTranslations("Header"),
    getTranslations("Staff"),
  ]);

  const details = [
    { key: "name", value: user.name },
    { key: "email", value: user.email, ltr: true },
    { key: "role", value: tHeader(`roles.${user.role}`) },
    { key: "language", value: tStaff(`languages.${user.locale}`) },
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <section className={`${cardClass} flex items-center gap-4`}>
        <span
          className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
          aria-hidden
        >
          {initials(user.name)}
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {user.name}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-foreground-2">
            <Mail className="size-4 shrink-0" aria-hidden />
            <span dir="ltr" className="truncate">
              {user.email}
            </span>
          </p>
          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {tHeader(`roles.${user.role}`)}
          </span>
        </div>
      </section>

      <section className={`${cardClass} space-y-4`}>
        <h2 className="font-semibold text-foreground">{t("account")}</h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {details.map((item) => (
            <div key={item.key}>
              <dt className="text-xs text-foreground-2">{t(item.key)}</dt>
              <dd className="mt-0.5 break-all text-sm font-medium text-foreground">
                <bdi dir={"ltr" in item ? "ltr" : undefined}>{item.value}</bdi>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`${cardClass} space-y-4`}>
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck className="size-4 text-foreground-2" aria-hidden />
            {t("permissions")}
          </h2>
          <p className="text-sm text-foreground-2">
            {t("permissionsDescription")}
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PERMISSION_KEYS.map((key) => {
            const granted = user.permissions[key];
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card-2/40 px-3 py-2 text-sm"
              >
                <span className="text-foreground">
                  {tStaff(`permissionLabels.${key}`)}
                </span>
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${granted ? "text-success" : "text-muted"}`}
                >
                  {granted ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <X className="size-4" aria-hidden />
                  )}
                  {granted ? t("granted") : t("notGranted")}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
