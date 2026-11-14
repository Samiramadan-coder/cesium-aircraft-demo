import {
  FleetSkeleton,
  HeaderSkeleton,
  KpisSkeleton,
} from "@/components/engine-flight-hours/skeletons";

/** First load: the title, tabs, KPIs and the fleet cards. */
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6" aria-busy="true">
      <HeaderSkeleton />
      <KpisSkeleton />
      <FleetSkeleton />
    </div>
  );
}
