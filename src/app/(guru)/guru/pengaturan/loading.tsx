import { Skeleton } from "@/components/skeleton";

export default function PengaturanLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-3xl" />

      <div className="max-w-3xl">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-2 h-3.5 w-64" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
          <Skeleton className="mt-5 h-3 w-40" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-3.5 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
