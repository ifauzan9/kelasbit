"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound } from "@/components/icons";
import {
  createTugasGpsPass,
  setTugasGpsPassActive,
} from "@/lib/tugas/actions";
import type { TugasGpsPassView } from "@/lib/tugas/types";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function GpsPassControl({
  tugasId,
  userId,
  initialPass,
}: {
  tugasId: number;
  userId: number;
  initialPass: TugasGpsPassView | null;
}) {
  const router = useRouter();
  const [pass, setPass] = useState<TugasGpsPassView | null>(initialPass);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createPass() {
    if (pending) return;
    setPending(true);
    setError(null);

    const result = await createTugasGpsPass({ tugasId, userId });

    setPending(false);

    if (!result.ok || !result.pass) {
      setError(result.error ?? "Gagal membuat kode pass.");
      return;
    }

    setPass({
      ...result.pass,
      tugasId,
      userId,
    });
    setCopied(false);
    router.refresh();
  }

  async function toggleActive() {
    if (!pass || pending) return;

    setPending(true);
    setError(null);

    const result = await setTugasGpsPassActive({
      passId: pass.id,
      active: !pass.active,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Gagal mengubah status kode.");
      return;
    }

    setPass({ ...pass, active: !pass.active });
    router.refresh();
  }

  async function copyCode() {
    if (!pass) return;
    try {
      await navigator.clipboard.writeText(pass.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal menyalin. Salin kode secara manual.");
    }
  }

  return (
    <div className="border-b border-slate-100 bg-amber-50/40 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 ring-1 ring-amber-200">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
              Kode pass GPS
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-amber-800/70">
              Untuk siswa dengan GPS tidak akurat. Kode tetap aktif sampai
              dinonaktifkan manual.
            </p>
            {pass ? (
              <p className="mt-1 text-[10px] font-medium text-slate-500">
                {pass.usedAt
                  ? `Terakhir dipakai ${dateFormatter.format(new Date(pass.usedAt))} WIB`
                  : "Belum pernah dipakai siswa"}
              </p>
            ) : null}
            {error ? (
              <p className="mt-1 text-[10px] font-semibold text-rose-600">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={createPass}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {pending ? "Menyimpan…" : pass ? "Buat kode baru" : "Buat kode GPS"}
        </button>
      </div>

      {pass ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2">
          <code className="rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-sm font-extrabold tracking-[0.2em] text-white">
            {pass.code}
          </code>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ring-1 ${
              pass.active
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-slate-100 text-slate-500 ring-slate-200"
            }`}
          >
            {pass.active ? "Aktif" : "Nonaktif"}
          </span>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-100"
          >
            <Copy className="h-3 w-3" />
            {copied ? "Tersalin" : "Salin"}
          </button>
          <button
            type="button"
            onClick={toggleActive}
            disabled={pending}
            className={`ml-auto rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-50 ${
              pass.active
                ? "text-rose-600 hover:bg-rose-50"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            {pending
              ? "Menyimpan…"
              : pass.active
                ? "Nonaktifkan"
                : "Aktifkan"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
