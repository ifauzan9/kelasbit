import { Skeleton } from "@/components/skeleton";

export default function SiswaLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-3xl" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Skeleton className="h-[420px] w-full rounded-3xl" />

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-2 h-3.5 w-56" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl sm:w-64" />
          </div>

          <div className="mt-4 flex gap-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-8 w-20 rounded-full" />
            ))}
          </div>

          <div className="mt-5 space-y-2.5">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-[74px] w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      <Skeleton className="h-48 w-full rounded-3xl" />
    </div>
  );
}
