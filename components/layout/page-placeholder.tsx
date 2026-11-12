import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NavItem } from "@/constants/navigation";
import { NAV_ITEMS } from "@/constants/navigation";

/** Empty state for a section that isn't built yet. */
export function PagePlaceholder({
  page,
}: {
  page: Exclude<NavItem["key"], "live">;
}) {
  const t = useTranslations("Pages");
  const Icon: LucideIcon = NAV_ITEMS.find((item) => item.key === page)!.icon;

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
          <Icon className="size-6" />
        </div>
        <p className="text-sm leading-relaxed text-foreground-2">
          {t(`${page}.description`)}
        </p>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
          {t("comingSoon")}
        </span>
      </div>
    </div>
  );
}
