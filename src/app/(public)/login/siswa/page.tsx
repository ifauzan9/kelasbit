import type { Metadata } from "next";
import { AuthCard, AuthLink } from "@/components/auth-card";
import { BookOpen } from "@/components/icons";
import { SiswaLoginTabs } from "@/components/siswa-login-tabs";

export const metadata: Metadata = {
  title: "Login Siswa — KelasBit",
};

export default function LoginSiswaPage() {
  return (
    <AuthCard
      icon={<BookOpen className="h-6 w-6" />}
      accent="brand"
      title="Login Siswa"
      description="Masuk dengan username & password, atau token kelas dari guru."
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
      <SiswaLoginTabs />
    </AuthCard>
  );
}
