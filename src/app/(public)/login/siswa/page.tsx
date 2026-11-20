import type { Metadata } from "next";
import { AuthCard, AuthLink } from "@/components/auth-card";
import { MaintenanceScheduleNotice } from "@/components/maintenance-schedule-notice";
import { SiswaLoginTabs } from "@/components/siswa-login-tabs";
import { getMaintenanceSetting } from "@/lib/settings/maintenance";
import { getTokenLoginEnabled } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Login Siswa — KelasBit",
};

export const dynamic = "force-dynamic";

export default async function LoginSiswaPage() {
  const [tokenEnabled, maintenance] = await Promise.all([
    getTokenLoginEnabled(),
    getMaintenanceSetting(),
  ]);

  return (
    <AuthCard
      logo
      accent="brand"
      title="Login Siswa"
      description={
        tokenEnabled
          ? "Masuk dengan username & password, atau token kelas dari guru."
          : "Masuk dengan username & password."
      }
      footer={
        <div className="space-y-2">
          <p>
            Kamu guru? <AuthLink href="/login/guru">Masuk di sini</AuthLink>
          </p>
          <p className="text-xs text-slate-400">
            <AuthLink href="/">Kembali ke beranda</AuthLink>
          </p>
        </div>
      }
    >
      <MaintenanceScheduleNotice setting={maintenance} className="mb-5" />
      <SiswaLoginTabs tokenEnabled={tokenEnabled} />
    </AuthCard>
  );
}
