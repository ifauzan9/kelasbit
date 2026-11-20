import type { Metadata } from "next";
import { AuthCard, AuthLink } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login Guru — KelasBit",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginGuruPage() {
  return (
    <AuthCard
      logo
      accent="emerald"
      title="Login Guru"
      description="Masuk untuk mengelola kelas, materi, dan nilai siswa."
      footer={
        <div className="space-y-2">
          <p>
            Kamu siswa? <AuthLink href="/login/siswa">Masuk di sini</AuthLink>
          </p>
          <p className="text-xs text-slate-400">
            <AuthLink href="/">Kembali ke beranda</AuthLink>
          </p>
        </div>
      }
    >
      <LoginForm role="guru" />
    </AuthCard>
  );
}
