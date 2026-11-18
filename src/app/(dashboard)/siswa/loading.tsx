import { Skeleton } from "@/components/skeleton";

export default function SiswaLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full rounded-3xl" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200/80 bg-white p-5"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200/80 bg-white p-5"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            </div>
            <Skeleton className="mt-4 h-32 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
