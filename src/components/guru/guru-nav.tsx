"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  BarChart,
  BookOpen,
  ClipboardList,
  GraduationCap,
  History,
  Home,
  Settings,
  UserRound,
  Users,
} from "@/components/icons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const navItems: {
  label: string;
  icon: IconComponent;
  href?: string;
}[] = [
  { label: "Dashboard", icon: Home, href: "/guru" },
  { label: "Kelas", icon: GraduationCap, href: "/guru/kelas" },
  { label: "Materi", icon: BookOpen, href: "/guru#materi" },
  { label: "Tugas", icon: ClipboardList, href: "/guru/tugas" },
  { label: "Siswa", icon: Users, href: "/guru/siswa" },
  { label: "Log Login", icon: History, href: "/guru/log-login" },
  { label: "Nilai", icon: BarChart },
  { label: "Pengaturan", icon: Settings, href: "/guru/pengaturan" },
  { label: "Profil", icon: UserRound, href: "/guru/profil" },
];

function isActive(href: string | undefined, pathname: string): boolean {
  if (!href) return false;
  if (href.includes("#")) return false;
  if (href === "/guru") return pathname === "/guru";

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GuruSidebarNav() {
  const pathname = usePathname();

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
              aria-current={isActive(href, pathname) ? "page" : undefined}
              className={
                isActive(href, pathname)
                  ? "flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-sm font-bold text-emerald-800 shadow-lg shadow-emerald-950/30"
                  : "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              }
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
            className="flex cursor-default items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            {content}
          </span>
        );
      })}
    </nav>
  );
}

export function GuruMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3 lg:hidden">
      {navItems.map(({ label, icon: Icon, href }) =>
        href ? (
          <Link
            key={label}
            href={href}
            aria-current={isActive(href, pathname) ? "page" : undefined}
            className={
              isActive(href, pathname)
                ? "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                : "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
            }
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
  );
}

export function GuruSectionLabel() {
  const pathname = usePathname();

  const label = pathname.startsWith("/guru/kelas")
    ? "Kelas"
    : pathname.startsWith("/guru/tugas")
      ? "Tugas"
      : pathname.startsWith("/guru/siswa")
        ? "Siswa"
      : pathname.startsWith("/guru/log-login")
        ? "Log Login"
        : pathname.startsWith("/guru/pengaturan")
          ? "Pengaturan"
          : pathname.startsWith("/guru/profil")
            ? "Profil"
            : "Dashboard";

  return (
    <>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-emerald-600">
        Kelas Guru
      </p>
      <p className="text-sm font-extrabold tracking-tight text-slate-900">{label}</p>
    </>
  );
}
