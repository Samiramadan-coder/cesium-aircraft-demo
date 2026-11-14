import { TableSkeleton } from "@/components/engine-flight-hours/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

const KPI_COUNT = 6;
const COLUMN_COUNT = 10;
/** Range, aircraft, type, pilot, flight type and compliance, after the search box. */
const FILTER_COUNT = 6;

const surface = "rounded-xl bg-card ring-1 ring-foreground/10";

/** Mirrors the page: title + export, KPI cards, filters, then the table beside the charts. */
export default function Loading() {
  return (
    <div className="space-y-6 p-4 sm:p-6" aria-busy="true">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 bg-card" />
            <Skeleton className="h-4 w-96 max-w-full bg-card" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg bg-card" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: KPI_COUNT }, (_, i) => (
            <div key={i} className={`space-y-2 px-4 py-3 ${surface}`}>
              <Skeleton className="h-3 w-24 bg-card-2" />
              <Skeleton className="h-7 w-16 bg-card-2" />
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-64 rounded-lg bg-card" />
        {Array.from({ length: FILTER_COUNT }, (_, i) => (
          <Skeleton key={i} className="h-9 w-40 rounded-lg bg-card" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="min-w-0 md:col-span-3">
          <TableSkeleton columns={COLUMN_COUNT} />
        </div>

        <div className="space-y-6">
          {[40, 36, 32].map((height, i) => (
            <div key={i} className={`space-y-4 p-4 ${surface}`}>
              <Skeleton className="h-4 w-36 bg-card-2" />
              <Skeleton className="w-full bg-card-2" style={{ height: height * 4 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
