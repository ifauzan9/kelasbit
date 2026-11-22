"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Users } from "@/components/icons";
import {
  StudentPicker,
  type StudentOption,
} from "@/components/tugas/student-picker";
import { addTugasTargets } from "@/lib/tugas/actions";

export function AddTugasTargets({
  tugasId,
  students,
}: {
  tugasId: number;
  students: StudentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (pending || selected.length === 0) return;

    setPending(true);
    setError(null);

    const result = await addTugasTargets({
      tugasId,
      userIds: selected,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error ?? "Gagal menambah siswa.");
      return;
    }

    setSelected([]);
    setOpen(false);
    router.refresh();
  }

  if (students.length === 0) {
    return (
      <p className="mt-2 text-[10px] font-medium text-slate-400">
        Semua siswa aktif sudah menjadi target tugas ini.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Tambah siswa
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
      <div className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-emerald-600" />
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
          Tambah siswa ke target
        </p>
      </div>

      <div className="mt-2">
        <StudentPicker
          students={students}
          value={selected}
          onChange={setSelected}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-[10px] font-semibold text-rose-600"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || selected.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
          {pending ? "Menambahkan…" : `Tambahkan ${selected.length || ""}`}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setSelected([]);
            setError(null);
          }}
          disabled={pending}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
