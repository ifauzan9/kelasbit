import { PageShell, Skeleton } from "@/components/skeleton";

export default function GuruLoading() {
  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="mt-3 h-9 w-72" />
          <Skeleton className="mt-3 h-3.5 w-48" />
        </div>
        <Skeleton className="h-11 w-24 rounded-xl" />
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200/70 bg-white">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-3.5 w-72" />
        </div>

        <div className="grid gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-5 sm:grid-cols-[1fr_180px] sm:px-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <Skeleton className="h-11 w-36 rounded-xl sm:col-span-2" />
        </div>

        <div className="divide-y divide-slate-100">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6"
            >
              <div className="w-full">
                <Skeleton className="h-3.5 w-52" />
                <Skeleton className="mt-2.5 h-3.5 w-full max-w-xl" />
                <Skeleton className="mt-2 h-3 w-28" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-14 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
