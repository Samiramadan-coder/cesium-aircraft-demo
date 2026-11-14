import { Ruler } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ZoneComputed } from "@/types/tracking";

/**
 * Area, size and where each point lies from the airport ("345° / 3.95 NM"),
 * from `/v1/tracking/zones/{zone}/computed`. The point labels match the
 * numbered dots on the map (P1 = 1).
 */
export default function ZoneGeometry({
  computed,
}: {
  /** Null when the request failed; the section says so instead. */
  computed: ZoneComputed | null;
}) {
  const t = useTranslations("Zones.geometry");
  const format = useFormatter();

  // The API sends raw floats (51.3200000000000003…).
  const nm = (value: number) =>
    format.number(value, { maximumFractionDigits: 2 });

  const bearing = (degrees: number) =>
    `${String(Math.round(degrees) % 360).padStart(3, "0")}°`;

  const label = (value: string) =>
    value === "Center" ? t("center") : value;

  return (
    <section className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="flex items-center gap-2 font-semibold text-foreground">
        <Ruler className="size-4 text-foreground-2" />
        {t("title")}
      </h2>

      {!computed ? (
        <p className="text-sm text-foreground-2">{t("unavailable")}</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2">
            {[
              { key: "area", value: t("areaValue", { value: nm(computed.areaNm2) }) },
              { key: "extent", value: t("nmValue", { value: nm(computed.maxExtentNm) }) },
              {
                key: "vertices",
                value: computed.vertices > 0 ? format.number(computed.vertices) : "—",
              },
            ].map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-border bg-card-2/40 px-2.5 py-2"
              >
                <dt className="text-xs text-foreground-2">{t(item.key as "area")}</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          {computed.bearings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-foreground-2">
                {t("fromReference", { reference: computed.reference })}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-foreground-2">
                    <th className="pb-1 text-start font-normal">{t("point")}</th>
                    <th className="pb-1 text-end font-normal">{t("bearing")}</th>
                    <th className="pb-1 text-end font-normal">{t("distance")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {computed.bearings.map((item) => (
                    <tr key={item.label}>
                      <td className="py-1.5 font-medium text-foreground">
                        {label(item.label)}
                      </td>
                      <td dir="ltr" className="py-1.5 text-end tabular-nums text-foreground">
                        {bearing(item.bearingDeg)}
                      </td>
                      <td className="py-1.5 text-end tabular-nums text-foreground">
                        {t("nmValue", { value: nm(item.distanceNm) })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
