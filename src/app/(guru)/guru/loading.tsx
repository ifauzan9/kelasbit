import { Skeleton } from "@/components/skeleton";

export default function GuruLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full rounded-3xl" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Skeleton className="h-[440px] w-full rounded-3xl" />

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-3.5 w-56" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl sm:w-64" />
          </div>

          <div className="mt-4 flex gap-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
