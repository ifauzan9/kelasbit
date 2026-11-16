import { Skeleton } from "@/components/skeleton";

export default function SiswaLoading() {
  return (
    <>
      <div className="rounded-3xl bg-linear-to-br from-emerald-100 via-emerald-50 to-slate-100 p-8 sm:p-10">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3.5 w-full max-w-xl" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200/80 bg-white p-5"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            </div>
            <Skeleton className="mt-4 h-36 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
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
            <Skeleton className="mt-4 h-36 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </>
  );
}
