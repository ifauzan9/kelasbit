import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthCard, AuthLink } from "@/components/auth-card";
import { BookOpen } from "@/components/icons";
import { SiswaLoginTabs } from "@/components/siswa-login-tabs";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getMaintenanceSetting,
  getMaintenanceStudentToken,
  isValidMaintenanceToken,
} from "@/lib/settings/maintenance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login Siswa — KelasBit",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function MaintenanceSiswaLoginPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const expected = await getMaintenanceStudentToken();

  if (!isValidMaintenanceToken(token, expected)) {
    notFound();
  }

  const maintenance = await getMaintenanceSetting();

  if (!maintenance.enabled) {
    redirect("/login/siswa");
  }

  const user = await getCurrentUser();

  if (user?.role === "guru") {
    redirect("/sesi");
  }

  if (user?.role === "siswa" && user.maintenanceAccess) {
    redirect("/siswa");
  }

  return (
    <AuthCard
      icon={<BookOpen className="h-6 w-6" />}
      accent="brand"
      title="Login Siswa"
      description="Halaman login khusus selama mode maintenance."
      footer={
        <p className="text-xs text-slate-400">
          <AuthLink href="/maintenance">Kembali ke halaman maintenance</AuthLink>
        </p>
      }
    >
      <SiswaLoginTabs initialMode="token" />
    </AuthCard>
  );
}
