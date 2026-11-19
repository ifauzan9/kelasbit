import { Skeleton } from "@/components/skeleton";

export default function ProfilSiswaLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-3xl" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Skeleton className="h-[420px] w-full rounded-3xl" />

        <div className="space-y-5">
          <Skeleton className="h-[380px] w-full rounded-3xl" />
          <Skeleton className="h-[440px] w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
