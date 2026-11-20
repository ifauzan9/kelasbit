"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Copy,
  KeyRound,
  Save,
  ShieldCheck,
} from "@/components/icons";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import {
  rotateMaintenanceStudentToken,
  rotateMaintenanceToken,
  saveMaintenanceSetting,
  type MaintenanceSettingState,
} from "@/lib/settings/actions";
import { MAX_MAINTENANCE_MESSAGE, MAX_MAINTENANCE_TITLE } from "@/lib/settings/maintenance-constants";

const initialState: MaintenanceSettingState = {};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Pratinjau nilai `<input type="datetime-local">` (sudah dalam WIB). */
function formatLocalDateTime(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${year} ${hour}.${minute} WIB`;
}

export function MaintenanceSetting({
  enabled,
  title,
  message,
  startValue,
  startLabel,
  untilValue,
  untilLabel,
  updatedAt,
  expired,
  scheduleState,
  envControlled,
  loginPath,
  studentLoginPath,
  tokenSource,
}: {
  enabled: boolean;
  title: string;
  message: string;
  startValue: string;
  startLabel: string | null;
  untilValue: string;
  untilLabel: string | null;
  updatedAt: Date | null;
  expired: boolean;
  scheduleState: "none" | "pending" | "active" | "expired";
  envControlled: boolean;
  loginPath: string;
  studentLoginPath: string;
  tokenSource: "db" | "env";
}) {
  const [state, formAction, pending] = useActionState(
    saveMaintenanceSetting,
    initialState,
  );
  const [rotateState, rotateAction, rotating] = useActionState(
    rotateMaintenanceToken,
    initialState,
  );
  const [rotateStudentState, rotateStudentAction, rotatingStudent] =
    useActionState(rotateMaintenanceStudentToken, initialState);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [titleValue, setTitleValue] = useState(title);
  const [messageValue, setMessageValue] = useState(message);
  const [startLocal, setStartLocal] = useState(startValue);
  const [untilLocal, setUntilLocal] = useState(untilValue);

  useRefreshOnSuccess(state);
  useRefreshOnSuccess(rotateState);
  useRefreshOnSuccess(rotateStudentState);

  useEffect(() => {
    setIsEnabled(enabled);
    setTitleValue(title);
    setMessageValue(message);
    setStartLocal(startValue);
    setUntilLocal(untilValue);
  }, [enabled, title, message, startValue, untilValue]);

  const activeLoginPath =
    (rotateState.success && rotateState.loginPath) ||
    (state.success && state.loginPath) ||
    loginPath;
  const activeStudentLoginPath =
    (rotateStudentState.success && rotateStudentState.studentLoginPath) ||
    (state.success && state.studentLoginPath) ||
    studentLoginPath;

  const statusLabel = envControlled
    ? enabled
      ? "Aktif (env)"
      : "Nonaktif (env)"
    : enabled
      ? scheduleState === "active"
        ? "Aktif (jadwal)"
        : "Aktif"
      : expired
        ? "Nonaktif — jadwal selesai"
        : scheduleState === "pending"
          ? "Terjadwal"
          : "Nonaktif";

  const statusClass = enabled
    ? "shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100"
    : scheduleState === "pending"
      ? "shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-sky-700 ring-1 ring-sky-100"
      : "shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200";

  const localStartLabel = formatLocalDateTime(startLocal);
  const localUntilLabel = formatLocalDateTime(untilLocal);
  const schedulePreview =
    localStartLabel && localUntilLabel
      ? `${localStartLabel} → ${localUntilLabel}`
      : null;

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Mode Maintenance
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Tutup sementara halaman publik dan area siswa, dengan URL login
              guru khusus.
            </p>
          </div>
        </div>

        <span className={statusClass}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        <SecretUrlBox
          title="URL login guru saat maintenance"
          loginPath={activeLoginPath}
          rotateAction={rotateAction}
          rotateState={rotateState}
          rotating={rotating}
          canRotate={tokenSource === "db"}
          intent="rotate"
          note={
            tokenSource === "env"
              ? "URL sedang dikontrol Environment Variables cPanel (MAINTENANCE_GURU_TOKEN)."
              : "Simpan URL ini. Halaman maintenance publik tidak menautkan URL ini."
          }
        />

        <SecretUrlBox
          title="URL login siswa saat maintenance"
          loginPath={activeStudentLoginPath}
          rotateAction={rotateStudentAction}
          rotateState={rotateStudentState}
          rotating={rotatingStudent}
          canRotate
          intent="rotate-student"
          note="Siswa memakai token kelas atau username & password di halaman ini. Halaman maintenance publik tidak menautkan URL ini."
        />
      </div>

      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            isEnabled &&
            !enabled &&
            !window.confirm(
              "Aktifkan mode maintenance? Halaman publik dan area siswa akan ditutup.",
            )
          ) {
            event.preventDefault();
          }

          if (
            !isEnabled &&
            enabled &&
            !window.confirm("Matikan mode maintenance dan buka kembali situs?")
          ) {
            event.preventDefault();
          }

          const scheduleEdited =
            startLocal !== startValue || untilLocal !== untilValue;

          if (
            scheduleEdited &&
            startLocal &&
            !untilLocal &&
            !window.confirm(
              "Jadwalkan maintenance tanpa waktu selesai? Situs akan tetap maintenance sampai Anda mematikannya manual.",
            )
          ) {
            event.preventDefault();
          }
        }}
        className="mt-6"
      >
        <input type="hidden" name="enabled" value={String(isEnabled)} />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">
              Aktifkan mode maintenance
            </p>
            <p className="mt-1 max-w-md text-[11px] leading-relaxed text-slate-500">
              Selama aktif, pengunjung hanya melihat halaman maintenance. Guru
              tetap bisa masuk lewat URL khusus di atas. Mengubah saklar ini
              hanya menimpa status saat ini; jadwal otomatis tetap berjalan.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            aria-label={
              isEnabled
                ? "Nonaktifkan mode maintenance"
                : "Aktifkan mode maintenance"
            }
            disabled={pending || envControlled}
            onClick={() => setIsEnabled((value) => !value)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isEnabled ? "bg-amber-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {envControlled ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-amber-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Mode maintenance sedang dikontrol Environment Variables cPanel
            (MAINTENANCE_MODE). Hapus atau ubah variabel itu lalu Restart
            aplikasi untuk memakai tombol ini.
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Judul halaman
            </span>
            <input
              type="text"
              name="title"
              value={titleValue}
              onChange={(event) => setTitleValue(event.target.value)}
              maxLength={MAX_MAINTENANCE_TITLE}
              placeholder="Sedang Dalam Perbaikan"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Pesan
            </span>
            <textarea
              name="message"
              value={messageValue}
              onChange={(event) => setMessageValue(event.target.value)}
              maxLength={MAX_MAINTENANCE_MESSAGE}
              rows={3}
              placeholder="KelasBit sedang dalam perbaikan…"
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
            <span className="mt-1 block text-[10px] font-medium text-slate-400">
              {messageValue.length}/{MAX_MAINTENANCE_MESSAGE} karakter
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              Mulai otomatis pada (WIB)
            </span>
            <input
              type="datetime-local"
              name="start"
              value={startLocal}
              onChange={(event) => setStartLocal(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
            <span className="mt-1 block text-[10px] font-medium text-slate-400">
              Waktu situs mulai ditutup otomatis.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              Selesai otomatis pada (WIB) — opsional
            </span>
            <input
              type="datetime-local"
              name="until"
              value={untilLocal}
              onChange={(event) => setUntilLocal(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
            />
            <span className="mt-1 block text-[10px] font-medium text-slate-400">
              Kosongkan agar maintenance tetap aktif sampai dimatikan manual.
            </span>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
          <div className="min-w-0 text-[11px] leading-relaxed text-slate-500">
            {schedulePreview ? (
              <p>
                <span className="font-bold text-slate-700">Jadwal:</span>{" "}
                {schedulePreview}.
              </p>
            ) : localStartLabel ? (
              <p>
                <span className="font-bold text-slate-700">Jadwal:</span> mulai{" "}
                {localStartLabel}, tanpa waktu selesai.
              </p>
            ) : localUntilLabel ? (
              <p>
                <span className="font-bold text-slate-700">
                  Buka otomatis:
                </span>{" "}
                {localUntilLabel}. Isi waktu mulai untuk menjadwalkan
                maintenance penuh.
              </p>
            ) : startLabel && untilLabel ? (
              <p>
                <span className="font-bold text-slate-700">Jadwal:</span>{" "}
                {startLabel} → {untilLabel}.
              </p>
            ) : startLabel ? (
              <p>
                <span className="font-bold text-slate-700">Jadwal:</span> mulai{" "}
                {startLabel}, tanpa waktu selesai.
              </p>
            ) : (
              <p>
                Belum ada jadwal otomatis. Isi kedua waktu di atas untuk
                menjadwalkan maintenance sekali jalan.
              </p>
            )}
            {scheduleState === "pending" ? (
              <p className="mt-0.5 font-semibold text-sky-700">
                Menunggu waktu mulai — situs masih normal.
              </p>
            ) : null}
            {scheduleState === "active" ? (
              !enabled ? (
                <p className="mt-0.5 font-semibold text-amber-700">
                  Override manual aktif — situs sedang dibuka.
                </p>
              ) : untilLabel ? (
                <p className="mt-0.5 font-semibold text-emerald-700">
                  Jadwal sedang berjalan — situs otomatis maintenance.
                </p>
              ) : (
                <p className="mt-0.5 font-semibold text-emerald-700">
                  Jadwal berjalan tanpa waktu selesai — situs maintenance
                  sampai dimatikan manual.
                </p>
              )
            ) : null}
            {scheduleState === "expired" ? (
              <p className="mt-0.5 font-semibold text-amber-700">
                Jadwal terakhir sudah selesai — situs normal otomatis.
              </p>
            ) : null}
          </div>

          {startLocal || untilLocal ? (
            <button
              type="button"
              onClick={() => {
                setStartLocal("");
                setUntilLocal("");
              }}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              Kosongkan jadwal
            </button>
          ) : null}
        </div>

        {state.error ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p
            role="status"
            className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Pengaturan maintenance berhasil disimpan.
            {state.enabled
              ? " Pastikan URL login guru di atas sudah disalin."
              : ""}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-slate-400">
            {pending
              ? "Menyimpan…"
              : updatedAt
                ? `Terakhir diubah: ${dateTimeFormatter.format(updatedAt)} WIB`
                : "Belum pernah diubah"}
          </p>

          <button
            type="submit"
            disabled={pending || rotating}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {pending ? "Menyimpan…" : "Simpan pengaturan"}
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-[11px] font-medium text-slate-500 sm:grid-cols-2">
        <p>• Halaman publik dan area siswa ditutup untuk sesi biasa.</p>
        <p>• Guru & siswa bisa masuk lewat URL khusus di atas.</p>
        <p>• Jadwal mulai/selesai memakai zona Asia/Jakarta (WIB).</p>
        <p>• Tanpa cron: status mengikuti waktu saat situs diakses.</p>
        <p>• Saklar manual hanya override sementara, tidak membatalkan jadwal.</p>
        <p>• Kosongkan kedua waktu untuk memakai mode manual saja.</p>
        <p>• Waktu selesai opsional: tanpa selesai, matikan manual untuk membuka situs.</p>
      </div>
    </section>
  );
}

function SecretUrlBox({
  title,
  note,
  loginPath,
  rotateAction,
  rotateState,
  rotating,
  canRotate,
  intent,
}: {
  title: string;
  note: string;
  loginPath: string;
  rotateAction: (formData: FormData) => void;
  rotateState: MaintenanceSettingState;
  rotating: boolean;
  canRotate: boolean;
  intent: string;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin ? `${origin}${loginPath}` : loginPath;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
        <KeyRound className="h-3.5 w-3.5" />
        {title}
      </p>
      <p className="mt-2 break-all font-mono text-xs leading-relaxed text-slate-800">
        {url}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copyUrl}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-slate-700"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Tersalin" : "Salin URL"}
        </button>

        {canRotate ? (
          <form
            action={rotateAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "Buat URL baru? URL lama langsung tidak berlaku.",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              disabled={rotating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {rotating ? "Mengganti…" : "Ganti URL"}
            </button>
            <input type="hidden" name="intent" value={intent} />
          </form>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{note}</p>

      {rotateState.error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {rotateState.error}
        </p>
      ) : null}

      {rotateState.success ? (
        <p
          role="status"
          className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          URL baru berhasil dibuat. Salin sekarang.
        </p>
      ) : null}
    </div>
  );
}
