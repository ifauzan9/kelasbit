import { Skeleton } from "@/components/skeleton";

export default function LogLoginLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-3xl" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-2xl" />
        ))}
      </div>

      <Skeleton className="h-28 w-full rounded-3xl" />

      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-2 h-3.5 w-48" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>

        <div className="mt-5 space-y-2.5">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
