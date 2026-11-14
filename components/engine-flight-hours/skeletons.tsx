import { Skeleton } from "@/components/ui/skeleton";

const KPI_COUNT = 5;
const TAB_COUNT = 4;
const CARD_COUNT = 6;
const ROW_COUNT = 6;

const surface = "rounded-xl bg-card ring-1 ring-foreground/10";

/** Mirrors `Header` and `PageSwitcher`. */
export function HeaderSkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56 bg-card" />
          <Skeleton className="h-4 w-80 max-w-full bg-card" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg bg-card" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`flex gap-1 p-1 ${surface}`}>
          {Array.from({ length: TAB_COUNT }, (_, i) => (
            <Skeleton key={i} className="h-7 w-20 bg-card-2" />
          ))}
        </div>
        <Skeleton className="h-9 w-40 rounded-lg bg-card" />
      </div>
    </>
  );
}

/** Mirrors `Kpis`. */
export function KpisSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: KPI_COUNT }, (_, i) => (
        <div key={i} className={`space-y-2 px-4 py-3 ${surface}`}>
          <Skeleton className="h-3 w-20 bg-card-2" />
          <Skeleton className="h-7 w-16 bg-card-2" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors the fleet tab's aircraft cards. */
export function FleetSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <div key={i} className={`space-y-4 p-4 ${surface}`}>
          <div className="flex items-start gap-3">
            <Skeleton className="size-11 rounded-lg bg-card-2" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24 bg-card-2" />
              <Skeleton className="h-3 w-32 bg-card-2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full bg-card-2" />
          </div>
          <Skeleton className="h-14 rounded-lg bg-card-2" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-card-2" />
            <Skeleton className="h-1.5 w-full bg-card-2" />
          </div>
          <Skeleton className="h-9 rounded-lg bg-card-2" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors the pilots / daily log / maintenance tables. */
export function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div className={`overflow-hidden ${surface}`} aria-busy="true">
      <div className="flex gap-6 border-b border-border px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1 bg-card-2" />
        ))}
      </div>
      {Array.from({ length: ROW_COUNT }, (_, row) => (
        <div
          key={row}
          className="flex items-center gap-6 border-b border-border px-4 py-3.5 last:border-0"
        >
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton key={col} className="h-4 flex-1 bg-card-2" />
          ))}
        </div>
      ))}
    </div>
  );
}
