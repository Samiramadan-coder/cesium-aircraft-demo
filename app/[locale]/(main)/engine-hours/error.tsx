"use client";

import RouteError from "@/components/engine-flight-hours/route-error";

/** The whole section failed (KPIs / fleet request). */
export default function Error(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="p-4 sm:p-6">
      <RouteError {...props} />
    </div>
  );
}
