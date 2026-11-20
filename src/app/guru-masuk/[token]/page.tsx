import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthCard, AuthLink } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getEffectiveMaintenanceToken,
  getMaintenanceSetting,
  isValidMaintenanceToken,
} from "@/lib/settings/maintenance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login Guru — KelasBit",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function MaintenanceGuruLoginPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const effective = await getEffectiveMaintenanceToken();

  if (!isValidMaintenanceToken(token, effective.token)) {
    notFound();
  }

  const maintenance = await getMaintenanceSetting();

  if (!maintenance.enabled) {
    redirect("/login/guru");
  }

  const user = await getCurrentUser();

  if (user?.role === "guru") {
    redirect("/guru");
  }

  if (user) {
    redirect("/sesi");
  }

  return (
    <AuthCard
      logo
      accent="emerald"
      title="Login Guru"
      description="Halaman login khusus selama mode maintenance."
      footer={
        <p className="text-xs text-slate-400">
          <AuthLink href="/maintenance">Kembali ke halaman maintenance</AuthLink>
        </p>
      }
    >
      <LoginForm role="guru" />
    </AuthCard>
  );
}
