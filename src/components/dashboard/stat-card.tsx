import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type StatTone = "emerald" | "sky" | "violet" | "amber" | "rose";

const toneStyles: Record<StatTone, string> = {
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  rose: "bg-rose-50 text-rose-600 ring-rose-100",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  small = false,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: IconComponent;
  tone: StatTone;
  small?: boolean;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(16,12,40,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p
            className={
              small
                ? "mt-2 truncate text-lg font-extrabold tracking-tight text-slate-900"
                : "mt-2 text-3xl font-extrabold tracking-tight text-slate-900"
            }
          >
            {value}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${toneStyles[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 line-clamp-1 text-xs font-medium text-slate-400">{hint}</p>
    </div>
  );
}

export function MiniBar({
  label,
  value,
  total,
  barClass,
}: {
  label: string;
  value: number;
  total: number;
  barClass: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
