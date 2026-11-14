import {
  KpisSkeleton,
  FleetSkeleton,
} from "@/components/engine-flight-hours/skeletons";

export default function Loading() {
  return (
    <>
      <KpisSkeleton />
      <FleetSkeleton />
    </>
  );
}
