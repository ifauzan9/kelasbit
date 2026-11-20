import Link from "next/link";
import { KelasbitLogo } from "./kelasbit-logo";
import { LogIn } from "./icons";
import { LinkPendingIndicator } from "./link-pending";

const navigation = [
  { label: "Beranda", href: "#beranda", active: true },
  { label: "Tentang", href: "#tentang" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200/70 bg-white">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
          <KelasbitLogo
            className="h-11 w-11 sm:h-12 sm:w-12"
            priority
          />
          <span className="leading-tight">
            <span className="block text-[16px] font-extrabold tracking-tight text-slate-900 sm:text-[17px]">
              KelasBit
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">
              Informatika &amp; KKA
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex lg:gap-10">
          {navigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={
                item.active
                  ? "text-brand-600"
                  : "text-slate-500 transition-colors hover:text-brand-600"
              }
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-brand-600/30 transition-colors hover:bg-brand-700 sm:px-5 sm:py-3 sm:text-sm"
        >
          <LinkPendingIndicator idle={<LogIn className="h-4 w-4" />} />
          Login Siswa
        </Link>
      </div>
    </header>
  );
}
