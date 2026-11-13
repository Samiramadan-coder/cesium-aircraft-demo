import { Skeleton } from "@/components/ui/skeleton";

const KPI_COUNT = 7;
const ROW_COUNT = 6;
const COLUMN_COUNT = 7;

/** Mirrors the page: KPI cards, the actions row, then the table. */
export default function Loading() {
  return (
    <div className="p-4 sm:p-6 space-y-6" aria-busy="true">
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: KPI_COUNT }, (_, i) => (
            <div
              key={i}
              className="space-y-2 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10"
            >
              <Skeleton className="h-3 w-20 bg-card-2" />
              <Skeleton className="h-7 w-12 bg-card-2" />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Skeleton className="h-9 w-44 rounded-lg bg-card" />
          <Skeleton className="h-9 w-32 rounded-lg bg-card" />
        </div>
      </section>

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
                {col < 4 && <Skeleton className="h-3 w-3/5 bg-card-2" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
