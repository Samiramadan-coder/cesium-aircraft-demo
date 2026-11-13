"use client";

import RouteError from "@/components/engine-flight-hours/route-error";

/** One tab failed; the KPIs and the tab switcher stay usable. */
export default function Error(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <RouteError {...props} />;
}
