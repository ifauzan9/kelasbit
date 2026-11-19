import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth/session";
import { getMaintenanceSetting } from "@/lib/settings/maintenance";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser("siswa");
  const maintenance = await getMaintenanceSetting();

  // Selama maintenance, area siswa hanya terbuka untuk sesi yang dibuat lewat
  // halaman login khusus (/siswa-masuk/<token>).
  if (maintenance.enabled && !user.maintenanceAccess) {
    redirect("/maintenance");
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
