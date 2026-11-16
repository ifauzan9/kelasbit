import { Skeleton } from "@/components/skeleton";

export default function LoginSiswaLoading() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-[0_30px_60px_-40px_rgba(30,20,90,0.45)] sm:p-9">
        <div className="mb-8 flex flex-col items-center">
          <Skeleton className="mb-4 h-12 w-12 rounded-2xl" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-3 h-3.5 w-56" />
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="mx-auto h-3.5 w-44" />
        </div>
      </div>
    </main>
  );
}
