"use client";

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { AirportWeather } from "@/types/weather";

/** Icon for a WMO weather code (https://open-meteo.com/en/docs). */
function WeatherIcon({ code, isDay }: { code: number; isDay: boolean }) {
  const props = { className: "size-4.5 text-sky-300", "aria-hidden": true };
  if (code === 0) return isDay ? <Sun {...props} /> : <Moon {...props} />;
  if (code <= 2) {
    return isDay ? <CloudSun {...props} /> : <CloudMoon {...props} />;
  }
  if (code === 3) return <Cloud {...props} />;
  if (code === 45 || code === 48) return <CloudFog {...props} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle {...props} />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return <CloudSnow {...props} />;
  }
  if (code >= 95) return <CloudLightning {...props} />;
  return <CloudRain {...props} />; // 61-67, 80-82
}

/** Current temperature at the airport. */
export function WeatherBadge({ weather }: { weather: AirportWeather }) {
  const t = useTranslations("Header");
  const label = t("weather", { station: weather.station });

  return (
    <div
      className="hidden h-9 items-center gap-2 rounded-full border border-border bg-card-2/60 px-3.5 text-sm sm:flex"
      title={label}
    >
      <WeatherIcon code={weather.weatherCode} isDay={weather.isDay} />
      <span className="font-semibold tabular-nums" dir="ltr">
        {Math.round(weather.temperature)}°C
      </span>
      <span className="hidden text-muted md:inline" aria-hidden>
        ·
      </span>
      <span className="sr-only text-muted md:not-sr-only">{label}</span>
    </div>
  );
}
