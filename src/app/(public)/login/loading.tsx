import { Skeleton } from "@/components/skeleton";

export default function LoginLoading() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-[0_30px_60px_-40px_rgba(30,20,90,0.45)] sm:p-9">
        <div className="mb-7 flex flex-col items-center">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-3 h-3.5 w-52" />
        </div>

        <div className="space-y-3">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-full max-w-[200px]" />
              </div>
              <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
            </div>
          ))}
        </div>

        <Skeleton className="mx-auto mt-6 h-3.5 w-36" />
      </div>
    </main>
  );
}
