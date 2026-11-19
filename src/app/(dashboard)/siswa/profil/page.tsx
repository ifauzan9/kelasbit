import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "@/components/icons";
import { PasswordForm } from "@/components/akun/password-form";
import { ProfileForm } from "@/components/akun/profile-form";
import { ProfileSummary } from "@/components/akun/profile-summary";
import { getProfile } from "@/lib/akun/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Profil Siswa — KelasBit",
};

export default async function SiswaProfilPage() {
  const user = await requireUser("siswa");
  const profile = await getProfile(user.id);

  if (!profile) redirect("/login");

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500 via-emerald-700 to-teal-950 px-6 py-7 text-white shadow-[0_30px_60px_-40px_rgba(5,150,105,0.55)] sm:px-9 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl"
        />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80 ring-1 ring-white/15">
            <Sparkles className="h-3.5 w-3.5" />
            Profil Siswa
          </span>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Profil Saya
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
            Kelola informasi akun dan keamanan login kamu dari satu tempat.
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <ProfileSummary profile={profile} />

        <div className="space-y-5">
          <ProfileForm
            name={profile.name}
            email={profile.email}
            role={profile.role}
          />
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
