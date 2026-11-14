import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 4;
const COLUMN_COUNT = 7;

/** Mirrors the page: the zones table. */
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6" aria-busy="true">
      {/* Search, status filter and "Add zone" */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-64 rounded-lg bg-card" />
          <Skeleton className="h-9 w-40 rounded-lg bg-card" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg bg-card" />
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex gap-6 border-b border-border px-4 py-3">
          {Array.from({ length: COLUMN_COUNT }, (_, i) => (
            <Skeleton key={i} className="h-4 flex-1 bg-card-2" />
          ))}
        </div>
        {Array.from({ length: ROW_COUNT }, (_, row) => (
          <div
            key={row}
            className="flex items-center gap-6 border-b border-border px-4 py-3.5 last:border-0"
          >
            {Array.from({ length: COLUMN_COUNT }, (_, col) => (
              <div key={col} className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-4/5 bg-card-2" />
                {col !== 4 && col !== 5 && (
                  <Skeleton className="h-3 w-3/5 bg-card-2" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* General settings */}
      <Skeleton className="h-64 rounded-xl bg-card" />

      {/* Aerodrome */}
      <Skeleton className="h-56 rounded-xl bg-card" />
    </div>
  );
}
