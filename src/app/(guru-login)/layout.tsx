import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getMaintenanceSetting } from "@/lib/settings/maintenance";

export const dynamic = "force-dynamic";

export default async function GuruLoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  const maintenance = await getMaintenanceSetting();

  if (maintenance.enabled) {
    // Redirect di layout (di atas boundary `loading.tsx`) tetap 307 instan,
    // tidak berubah menjadi 200 + meta refresh.
    redirect("/maintenance");
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#f8f8fd] py-10">
      {children}
    </div>
  );
}
