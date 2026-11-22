import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DraftStorageCleanup } from "@/components/dashboard/draft-storage-cleanup";
import { MaintenanceScheduleNotice } from "@/components/maintenance-schedule-notice";
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
  // halaman login khusus (/siswa-masuk/<token>). Untuk maintenance terjadwal,
  // sesi dari jendela maintenance sebelumnya tidak boleh ikut lolos.
  if (maintenance.enabled) {
    const windowStartedAt =
      maintenance.scheduleState === "active" ? maintenance.start : null;
    const staleScheduledSession =
      windowStartedAt !== null &&
      user.sessionCreatedAt.getTime() < windowStartedAt.getTime();

    if (!user.maintenanceAccess || staleScheduledSession) {
      redirect("/sesi");
    }
  }

  return (
    <DashboardShell user={user}>
      <DraftStorageCleanup />
      <MaintenanceScheduleNotice setting={maintenance} className="mb-5" />
      {children}
    </DashboardShell>
  );
}
