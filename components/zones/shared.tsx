import { useLocale, useTranslations } from "next-intl";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { TrackedZone } from "@/types/tracking";

/** Translated API value ("trainingArea" → "Training area"), else the raw value. */
export function useLabel(group: "kinds" | "appliesToValues") {
  const t = useTranslations(`Zones.${group}`);
  return (value: string) => (t.has(value as never) ? t(value as never) : value);
}

/** The zone's name in the current locale: the Arabic name when there is one. */
export function useZoneName() {
  const locale = useLocale();
  return (zone: Pick<TrackedZone, "name" | "nameAr">) =>
    (locale === "ar" && zone.nameAr) || zone.name;
}

export function ZoneStatusBadge({ active }: { active: boolean }) {
  const t = useTranslations("Zones.statuses");

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        active
          ? "border-success/40 bg-success/10 text-success"
          : "border-border bg-card-2/40 text-foreground-2",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t(active ? "active" : "inactive")}
    </Badge>
  );
}
