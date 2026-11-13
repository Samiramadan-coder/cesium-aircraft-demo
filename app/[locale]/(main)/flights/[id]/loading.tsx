import { BackLink } from "@/components/flights/details/details-header";
import { Skeleton } from "@/components/ui/skeleton";

const surface = "rounded-xl bg-card ring-1 ring-foreground/10";

/** Mirrors the page: header, the replay (map, controls, charts) and the sidebar. */
export default function Loading() {
  return (
    <div className="space-y-4 p-4 sm:p-6" aria-busy="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          {/* Real link, so leaving a slow load is still possible. */}
          <BackLink />
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-44 bg-card" />
            <Skeleton className="h-5 w-20 rounded-full bg-card" />
          </div>
          <Skeleton className="h-4 w-48 bg-card" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg bg-card" />
          <Skeleton className="h-9 w-32 rounded-lg bg-card" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Skeleton className={`h-105 ${surface}`} />

          <div className={`space-y-3 p-4 ${surface}`}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg bg-card-2" />
              <Skeleton className="size-8 rounded-lg bg-card-2" />
              <Skeleton className="h-1 flex-1 bg-card-2" />
              <Skeleton className="h-3 w-20 bg-card-2" />
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <Skeleton className="h-6 w-40 bg-card-2" />
              <Skeleton className="h-8 w-48 bg-card-2" />
              <Skeleton className="h-6 w-56 bg-card-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={`space-y-3 p-4 ${surface}`}>
                <Skeleton className="h-3 w-28 bg-card-2" />
                <Skeleton className="h-28 w-full bg-card-2" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className={`flex items-center gap-3 p-4 ${surface}`}>
              <Skeleton className="size-10 rounded-lg bg-card-2" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28 bg-card-2" />
                <Skeleton className="h-3 w-20 bg-card-2" />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`space-y-2 p-4 ${surface}`}>
                <Skeleton className="size-4 bg-card-2" />
                <Skeleton className="h-6 w-14 bg-card-2" />
                <Skeleton className="h-3 w-20 bg-card-2" />
              </div>
            ))}
          </div>
          <Skeleton className={`h-40 ${surface}`} />
        </div>
      </div>
    </div>
  );
}
