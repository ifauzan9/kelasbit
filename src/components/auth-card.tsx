import Link from "next/link";
import type { ReactNode } from "react";
import { KelasbitLogo } from "./kelasbit-logo";

type AuthCardProps = {
  icon?: ReactNode;
  logo?: boolean;
  accent: "brand" | "emerald";
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

const iconStyles = {
  brand: "bg-brand-600 shadow-brand-600/30",
  emerald: "bg-emerald-600 shadow-emerald-600/30",
} as const;

export function AuthCard({
  icon,
  logo = false,
  accent,
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-[0_30px_60px_-40px_rgba(30,20,90,0.45)] sm:p-9">
        <div className="mb-8 flex flex-col items-center text-center">
          {logo ? (
            <KelasbitLogo className="mb-4 h-16 w-16" priority />
          ) : (
            <span
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg ${iconStyles[accent]}`}
            >
              {icon}
            </span>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        {children}

        {footer ? <div className="mt-6 text-center text-sm text-slate-500">{footer}</div> : null}
      </div>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-semibold text-slate-700 underline-offset-4 transition-colors hover:text-slate-900 hover:underline"
    >
      {children}
    </Link>
  );
}
