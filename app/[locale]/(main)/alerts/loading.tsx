import { TableSkeleton } from "@/components/engine-flight-hours/skeletons";

/** The alert feed's table; the KPIs and tabs come from the layout. */
export default function Loading() {
  return <TableSkeleton columns={7} />;
}
