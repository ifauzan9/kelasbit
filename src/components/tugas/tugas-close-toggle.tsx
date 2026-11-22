"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "@/components/icons";
import { setTugasManuallyClosed } from "@/lib/tugas/actions";

export function TugasCloseToggle({
  tugasId,
  initialClosed,
}: {
  tugasId: number;
  initialClosed: boolean;
}) {
  const router = useRouter();
  const [closed, setClosed] = useState(initialClosed);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (pending) return;

    const next = !closed;
    setClosed(next);
    setPending(true);
    setError(null);

    const result = await setTugasManuallyClosed({
      tugasId,
      closed: next,
    });

    setPending(false);

    if (!result.ok) {
      setClosed(!next);
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
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
              Tutup tugas
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
              Siswa tidak bisa membuka tugas ini. Kartu tetap tampil di akun
              siswa dengan status Ditutup.
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
          aria-checked={closed}
          aria-label="Tutup tugas untuk siswa"
          onClick={toggle}
          disabled={pending}
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            closed
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-white text-emerald-700"
          }`}
        >
          <span
            className={`relative h-4 w-7 rounded-full transition-colors ${
              closed ? "bg-amber-500" : "bg-emerald-500"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all ${
                closed ? "left-3.5" : "left-0.5"
              }`}
            />
          </span>
          {pending ? "Menyimpan…" : closed ? "Ditutup" : "Dibuka"}
        </button>
      </div>
    </div>
  );
}
