import {
  KpisSkeleton,
  TableSkeleton,
} from "@/components/engine-flight-hours/skeletons";

export default function Loading() {
  return (
    <>
      <KpisSkeleton />
      <TableSkeleton columns={9} />
    </>
  );
}
