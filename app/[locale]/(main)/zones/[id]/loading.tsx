import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the page: header, then the map beside the details. */
export default function Loading() {
  return (
    <div className="space-y-4 p-4 sm:p-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 bg-card" />
        <Skeleton className="h-7 w-56 bg-card" />
        <Skeleton className="h-4 w-24 bg-card" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[60dvh] min-h-80 rounded-xl bg-card lg:h-[calc(100dvh-12rem)]" />
        <Skeleton className="h-96 rounded-xl bg-card" />
      </div>
    </div>
  );
}
