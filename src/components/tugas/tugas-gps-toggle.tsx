"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "@/components/icons";
import { setTugasRequireGps } from "@/lib/tugas/actions";

export function TugasGpsToggle({
  tugasId,
  initialEnabled,
}: {
  tugasId: number;
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (pending) return;

    const next = !enabled;
    setEnabled(next);
    setPending(true);
    setError(null);

    const result = await setTugasRequireGps({ tugasId, enabled: next });

    setPending(false);

    if (!result.ok) {
      setEnabled(!next);
      setError(result.error ?? "Gagal menyimpan pengaturan.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              GPS wajib
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
              Siswa harus mengaktifkan GPS untuk membuka tugas. Lokasi valid
              1 jam dan tercatat di riwayat.
            </p>
            {error ? (
              <p className="mt-1 text-[10px] font-semibold text-rose-600">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Wajibkan GPS untuk tugas"
          onClick={toggle}
          disabled={pending}
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            enabled
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <span
            className={`relative h-4 w-7 rounded-full transition-colors ${
              enabled ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all ${
                enabled ? "left-3.5" : "left-0.5"
              }`}
            />
          </span>
          {pending ? "Menyimpan…" : enabled ? "Aktif" : "Nonaktif"}
        </button>
      </div>
    </div>
  );
}
