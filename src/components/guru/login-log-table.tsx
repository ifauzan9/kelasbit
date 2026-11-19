import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  MapPin,
  ShieldCheck,
} from "@/components/icons";
import type { LoginLogRow } from "@/lib/guru/login-log-queries";
import {
  formatAccuracy,
  formatLoginTime,
  formatUserAgent,
  locationStatusLabel,
  LOGIN_STATUS_LABELS,
  LOGIN_STATUS_STYLES,
  mapUrlFor,
  reasonLabel,
} from "@/lib/guru/login-log-utils";
import type { LoginLogStatus } from "@/lib/db/schema";

const STATUS_TILE: Record<LoginLogStatus, string> = {
  berhasil: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  gagal: "bg-amber-50 text-amber-600 ring-amber-100",
  diblokir: "bg-rose-50 text-rose-600 ring-rose-100",
};

const STATUS_ICON = {
  berhasil: CheckCircle2,
  gagal: AlertCircle,
  diblokir: ShieldCheck,
} as const;

function kelasLabel(row: LoginLogRow): string {
  if (!row.kelasName) return "Tanpa kelas";
  return row.academicYear ? `${row.kelasName} · ${row.academicYear}` : row.kelasName;
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex items-center rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-300">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

export function LoginLogTable({
  rows,
  total,
  page,
  pageCount,
  pageSize,
  hrefForPage,
}: {
  rows: LoginLogRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
}) {
  if (total === 0) {
    return (
      <div className="px-5 py-16 text-center sm:px-6">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-bold text-slate-600">
          Belum ada log login siswa
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Log akan muncul setelah siswa mencoba login.
        </p>
      </div>
    );
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <>
      <div className="hidden grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_150px_minmax(0,1fr)_150px] gap-3 border-b border-slate-100 px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 md:grid">
        <span>Siswa</span>
        <span>Kelas</span>
        <span>Status</span>
        <span>Jaringan &amp; Lokasi</span>
        <span>Waktu</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {rows.map((row) => {
          const Icon = STATUS_ICON[row.status];
          const reason = reasonLabel(row.reason);
          const mapUrl = mapUrlFor(row.latitude, row.longitude);
          const accuracy = formatAccuracy(row.accuracy);

          return (
            <li
              key={row.id}
              className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_150px_minmax(0,1fr)_150px] md:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${STATUS_TILE[row.status]}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {row.userName ?? "Tidak dikenal"}
                  </p>
                  <p className="truncate font-mono text-[11px] font-medium text-slate-400">
                    {row.identifier}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{kelasLabel(row)}</span>
              </div>

              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${LOGIN_STATUS_STYLES[row.status]}`}
                >
                  {LOGIN_STATUS_LABELS[row.status]}
                </span>
                {reason ? (
                  <p className="mt-1.5 text-[10px] font-medium text-slate-400">
                    {reason}
                  </p>
                ) : null}
              </div>

              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold text-slate-600">
                  {row.ip ?? "—"}
                </p>
                <p
                  className="truncate text-[11px] font-medium text-slate-400"
                  title={row.userAgent ?? undefined}
                >
                  {formatUserAgent(row.userAgent)}
                </p>
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 underline-offset-2 hover:underline"
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    Lihat peta{accuracy ? ` (${accuracy})` : ""}
                  </a>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {locationStatusLabel(row.locationStatus)}
                  </p>
                )}
              </div>

              <p className="text-xs font-medium text-slate-500">
                {formatLoginTime(row.createdAt)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-5">
        <p className="text-xs font-medium text-slate-500">
          Menampilkan {start}–{end} dari {total} log
        </p>

        <div className="flex items-center gap-2">
          <PageLink href={hrefForPage(page - 1)} disabled={page <= 1}>
            Sebelumnya
          </PageLink>
          <span className="px-1 text-xs font-bold text-slate-500">
            {page} / {pageCount}
          </span>
          <PageLink href={hrefForPage(page + 1)} disabled={page >= pageCount}>
            Berikutnya
          </PageLink>
        </div>
      </div>
    </>
  );
}
