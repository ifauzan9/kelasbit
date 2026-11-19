"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
} from "@/components/icons";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import {
  setLoginLocationEnabled,
  type LoginLocationSettingState,
} from "@/lib/settings/actions";

const initialState: LoginLocationSettingState = {};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function LoginLocationSetting({
  enabled,
  updatedAt,
}: {
  enabled: boolean;
  updatedAt: Date | null;
}) {
  const [state, formAction, pending] = useActionState(
    setLoginLocationEnabled,
    initialState,
  );
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [showSuccess, setShowSuccess] = useState(false);

  useRefreshOnSuccess(state);

  useEffect(() => {
    setIsEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!state.success) return;

    if (typeof state.enabled === "boolean") {
      setIsEnabled(state.enabled);
    }

    setShowSuccess(true);
    const timer = setTimeout(() => setShowSuccess(false), 4000);

    return () => clearTimeout(timer);
  }, [state.enabled, state.stamp, state.success]);

  const target = !isEnabled;

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Lokasi Login Siswa
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Atur apakah browser siswa diminta membagikan lokasi saat login.
            </p>
          </div>
        </div>

        <span
          className={
            isEnabled
              ? "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100"
              : "shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200"
          }
        >
          {isEnabled ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            target &&
            !window.confirm(
              "Aktifkan pelacakan lokasi? Browser siswa akan meminta izin lokasi saat login.",
            )
          ) {
            event.preventDefault();
          }
        }}
        className="mt-6"
      >
        <input type="hidden" name="enabled" value={String(target)} />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">
              Lacak lokasi saat login
            </p>
            <p className="mt-1 max-w-md text-[11px] leading-relaxed text-slate-500">
              Saat aktif, siswa melihat permintaan izin lokasi ketika menekan
              tombol masuk. Lokasi hanya disimpan jika login berhasil. Jika
              siswa menolak, login tetap berjalan.
            </p>
          </div>

          <button
            type="submit"
            role="switch"
            aria-checked={isEnabled}
            aria-label={
              isEnabled
                ? "Nonaktifkan lacak lokasi login"
                : "Aktifkan lacak lokasi login"
            }
            disabled={pending}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isEnabled ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                isEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
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

        {showSuccess ? (
          <p
            role="status"
            className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Pengaturan berhasil disimpan.
          </p>
        ) : null}

        <p className="mt-3 text-[11px] font-medium text-slate-400">
          {pending
            ? "Menyimpan…"
            : updatedAt
              ? `Terakhir diubah: ${dateTimeFormatter.format(updatedAt)} WIB`
              : "Belum pernah diubah"}
        </p>
      </form>

      <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-[11px] font-medium text-slate-500 sm:grid-cols-2">
        <p>• Lokasi hanya disimpan jika login berhasil.</p>
        <p>• Data ikut terhapus bersama retensi log 90 hari.</p>
        <p>• Siswa boleh menolak izin lokasi.</p>
        <p>• Wajib HTTPS agar browser mengizinkan lokasi.</p>
      </div>
    </section>
  );
}
