import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, GraduationCap, LogOut, Search } from "@/components/icons";
import {
  SiswaMobileNav,
  SiswaSidebarNav,
} from "@/components/dashboard/siswa-nav";
import { logout } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/session";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f4f7f5]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden bg-linear-to-b from-slate-900 via-emerald-950 to-slate-950 px-5 py-6 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-24 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl"
        />

        <Link href="/siswa" className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="text-lg font-extrabold leading-[1.15] tracking-tight">
            Kelas
            <br />
            Siswa
          </span>
        </Link>

        <div className="relative flex flex-1 flex-col">
          <SiswaSidebarNav />
        </div>

        <div className="relative mt-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <Link
            href="/siswa/profil"
            className="flex items-center gap-3 rounded-lg transition-colors hover:bg-white/5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-extrabold text-emerald-200 ring-1 ring-emerald-400/25">
              {initialsOf(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{user.name}</p>
              <p className="text-[11px] font-medium text-white/45">Siswa</p>
            </div>
          </Link>

          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
          <div className="flex h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/siswa" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-700/30">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="text-sm font-extrabold tracking-tight text-slate-900">
                Kelas Siswa
              </span>
            </Link>

            <div className="hidden lg:block">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-emerald-600">
                Kelas Siswa
              </p>
              <p className="text-sm font-extrabold tracking-tight text-slate-900">
                Dashboard
              </p>
            </div>

            <label className="relative hidden max-w-md flex-1 items-center sm:flex">
              <Search className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-slate-400" />
              <span className="sr-only">Cari materi, tugas, atau topik</span>
              <input
                type="search"
                placeholder="Cari materi, tugas, atau topik…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Notifikasi"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
              </button>

              <span className="hidden h-9 w-px bg-slate-200 sm:block" />

              <Link
                href="/siswa/profil"
                className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-slate-100"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {initialsOf(user.name)}
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block max-w-[160px] truncate text-sm font-bold text-slate-900">
                    {user.name}
                  </span>
                  <span className="block text-xs font-medium text-slate-400">Siswa</span>
                </span>
              </Link>
            </div>
          </div>

          <SiswaMobileNav />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
