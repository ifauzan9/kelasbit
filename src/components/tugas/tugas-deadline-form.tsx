"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "@/components/icons";
import { setTugasDeadline } from "@/lib/tugas/actions";

export function TugasDeadlineForm({
  tugasId,
  initialDueAt,
}: {
  tugasId: number;
  initialDueAt: string;
}) {
  const router = useRouter();
  const [dueAt, setDueAt] = useState(initialDueAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save() {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);

    const result = await setTugasDeadline({ tugasId, dueAt });
    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Gagal menyimpan deadline.");
      return;
    }

    setNotice(
      dueAt.trim()
        ? "Deadline berhasil diperbarui."
        : "Deadline dihapus. Tugas menjadi tanpa batas waktu.",
    );
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
          <CalendarDays className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            Batas waktu pengumpulan
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
            Atur ulang deadline tugas yang sudah dibuat. Waktu memakai WIB.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => {
                setDueAt(event.target.value);
                setError(null);
                setNotice(null);
              }}
              disabled={pending}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Menyimpan…" : "Simpan deadline"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDueAt("");
                setNotice(null);
                setError(null);
              }}
              disabled={pending || (!dueAt && !initialDueAt)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kosongkan
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-2 text-[10px] font-semibold text-rose-600">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="mt-2 text-[10px] font-semibold text-emerald-700">
              {notice}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
