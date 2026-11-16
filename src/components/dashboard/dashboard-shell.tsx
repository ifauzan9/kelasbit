import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  BarChart,
  Bell,
  BookOpen,
  ClipboardList,
  CodeXml,
  GraduationCap,
  Home,
  LogOut,
  Search,
  UserRound,
} from "@/components/icons";
import { logout } from "@/lib/auth/actions";
import type { SessionUser } from "@/lib/auth/session";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const navItems: { label: string; icon: IconComponent; href?: string }[] = [
  { label: "Dashboard", icon: Home, href: "/siswa" },
  { label: "Materi", icon: BookOpen },
  { label: "Tugas", icon: ClipboardList },
  { label: "Lab Coding", icon: CodeXml },
  { label: "Nilai", icon: BarChart },
  { label: "Profil", icon: UserRound },
];

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SidebarNav() {
  return (
    <nav className="mt-9 flex flex-1 flex-col gap-1.5">
      {navItems.map(({ label, icon: Icon, href }) => {
        const content = (
          <>
            <Icon className="h-5 w-5 shrink-0" />
            <span>{label}</span>
          </>
        );

        if (href) {
          return (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-900/20"
            >
              {content}
            </Link>
          );
        }

        return (
          <span
            key={label}
            aria-disabled
            title="Segera hadir"
            className="flex cursor-default items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            {content}
          </span>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f5f6fb]">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden bg-linear-to-b from-emerald-500 via-emerald-600 to-emerald-900 px-5 py-6 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />

        <Link href="/siswa" className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="text-lg font-extrabold leading-[1.15] tracking-tight">
            Ruang
            <br />
            Belajar
          </span>
        </Link>

        <div className="relative flex flex-1 flex-col">
          <SidebarNav />
        </div>

        <form action={logout} className="relative mt-4">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Keluar
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
          <div className="flex h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/siswa" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="text-sm font-extrabold tracking-tight text-slate-900">
                KelasBit
              </span>
            </Link>

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

              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  {initialsOf(user.name)}
                </span>
                <span className="hidden leading-tight sm:block">
                  <span className="block max-w-[160px] truncate text-sm font-bold text-slate-900">
                    {user.name}
                  </span>
                  <span className="block text-xs font-medium text-slate-400">Siswa</span>
                </span>
              </div>
            </div>
          </div>

          <nav className="flex gap-1.5 overflow-x-auto px-4 pb-3 lg:hidden">
            {navItems.map(({ label, icon: Icon, href }) =>
              href ? (
                <Link
                  key={label}
                  href={href}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ) : (
                <span
                  key={label}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              ),
            )}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
