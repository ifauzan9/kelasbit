import type { Metadata } from "next";
import { AuthCard, AuthLink } from "@/components/auth-card";
import { BookOpen } from "@/components/icons";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login Siswa — KelasBit",
};

export default function LoginSiswaPage() {
  return (
    <AuthCard
      icon={<BookOpen className="h-6 w-6" />}
      accent="brand"
      title="Login Siswa"
      description="Masuk untuk melanjutkan materi Informatika & KKA."
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
      <LoginForm role="siswa" />
    </AuthCard>
  );
}
