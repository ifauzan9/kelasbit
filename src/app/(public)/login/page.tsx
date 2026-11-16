import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChipAI, MonitorCode } from "@/components/icons";
import { LinkPendingIndicator } from "@/components/link-pending";

export const metadata: Metadata = {
  title: "Masuk — KelasBit",
};

const roles = [
  {
    href: "/login/siswa",
    label: "Siswa",
    description: "Lihat materi, kerjakan tugas, dan pantau progres belajar.",
    Icon: MonitorCode,
    iconWrap: "bg-brand-100 text-brand-600",
    hover: "hover:border-brand-300",
  },
  {
    href: "/login/guru",
    label: "Guru",
    description: "Kelola materi, tugas, dan nilai siswa.",
    Icon: ChipAI,
    iconWrap: "bg-emerald-50 text-emerald-600",
    hover: "hover:border-emerald-300",
  },
];

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-[0_30px_60px_-40px_rgba(30,20,90,0.45)] sm:p-9">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Masuk ke KelasBit
          </h1>
          <p className="mt-2 text-sm text-slate-500">Pilih peranmu untuk melanjutkan.</p>
        </div>

        <div className="space-y-3">
          {roles.map(({ href, label, description, Icon, iconWrap, hover }) => (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors ${hover}`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">Login {label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  {description}
                </span>
              </span>
              <LinkPendingIndicator
                idle={
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                }
              />
            </Link>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="font-semibold text-brand-600 hover:text-brand-700">
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </main>
  );
}
