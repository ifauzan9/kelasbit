import { Skeleton } from "@/components/skeleton";

export default function HomeLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-16 sm:px-6 lg:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <Skeleton className="h-7 w-44 rounded-full" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-11 w-full max-w-[420px]" />
            <Skeleton className="h-11 w-full max-w-[360px]" />
          </div>
          <div className="mt-6 space-y-2.5">
            <Skeleton className="h-3.5 w-full max-w-[430px]" />
            <Skeleton className="h-3.5 w-full max-w-[390px]" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Skeleton className="h-12 w-40 rounded-xl" />
            <Skeleton className="h-12 w-36 rounded-xl" />
          </div>
          <div className="mt-10 flex gap-8">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        <div className="mx-auto w-full max-w-[440px] rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_30px_60px_-40px_rgba(30,20,90,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3.5 w-2/5" />
          </div>
        </div>
      </div>

      <div className="mt-20 grid gap-5 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200/70 bg-white p-6"
          >
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="mt-4 h-5 w-40" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <div className="mt-5 flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
