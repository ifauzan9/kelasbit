"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Plus } from "@/components/icons";
import { useRefreshOnSuccess } from "@/components/guru/use-refresh-on-success";
import {
  StudentPicker,
  type StudentOption,
} from "@/components/tugas/student-picker";
import { createTugas, type TugasFormState } from "@/lib/tugas/actions";

const initialState: TugasFormState = {};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const codeClass =
  "w-full resize-y rounded-xl border border-slate-200 bg-slate-900 px-3.5 py-2.5 font-mono text-xs leading-relaxed text-slate-100 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-900/40";

export function TugasForm({
  kelasOptions,
  students,
}: {
  kelasOptions: { id: number; label: string }[];
  students: StudentOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createTugas,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [targetType, setTargetType] = useState<"semua" | "kelas" | "siswa">(
    "semua",
  );
  const [targetUserIds, setTargetUserIds] = useState<number[]>([]);

  useRefreshOnSuccess(state);

  useEffect(() => {
    if (!state.success) return;

    formRef.current?.reset();
    setShowAdvanced(false);
    setTargetType("semua");
    setTargetUserIds([]);
  }, [state.stamp, state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <Plus className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Buat Tugas / Ulangan
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Tugas coding dengan auto-grade berdasarkan output yang diharapkan.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="block text-xs font-bold text-slate-600">Judul</span>
          <input
            name="title"
            required
            maxLength={160}
            placeholder="Contoh: Latihan Perulangan"
            className={inputClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-slate-600">Jenis</span>
            <select name="jenis" defaultValue="tugas" className={inputClass}>
              <option value="tugas">Tugas</option>
              <option value="ulangan">Ulangan</option>
              <option value="remedial">Remedial</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-slate-600">
              Batas waktu (WIB)
            </span>
            <input
              type="datetime-local"
              name="dueAt"
              className={inputClass}
            />
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <p className="text-xs font-bold text-slate-600">Target tugas</p>

          <div
            role="radiogroup"
            aria-label="Target tugas"
            className="mt-2 grid gap-2 sm:grid-cols-3"
          >
            {[
              {
                id: "semua" as const,
                label: "Semua kelas",
                note: "Semua siswa",
              },
              {
                id: "kelas" as const,
                label: "Kelas tertentu",
                note: "Satu kelas",
              },
              {
                id: "siswa" as const,
                label: "Siswa tertentu",
                note: "Pilih siswa",
              },
            ].map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer flex-col rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                  targetType === option.id
                    ? "border-emerald-400 bg-white text-emerald-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="targetType"
                  value={option.id}
                  checked={targetType === option.id}
                  onChange={() => setTargetType(option.id)}
                  className="sr-only"
                />
                <span className="font-bold">{option.label}</span>
                <span className="mt-0.5 text-[10px] font-medium text-slate-400">
                  {option.note}
                </span>
              </label>
            ))}
          </div>

          {targetType === "kelas" ? (
            <label className="mt-3 block space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Pilih kelas
              </span>
              <select name="kelasId" defaultValue="" className={inputClass}>
                <option value="">— Pilih kelas —</option>
                {kelasOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {targetType === "siswa" ? (
            <div className="mt-3">
              <StudentPicker
                students={students}
                value={targetUserIds}
                onChange={setTargetUserIds}
              />
            </div>
          ) : null}

          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            Untuk remedial, biasanya pilih <strong>Siswa tertentu</strong>.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-slate-600">
              Nilai maksimal
            </span>
            <input
              type="number"
              name="maxScore"
              min={1}
              max={1000}
              defaultValue={100}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-slate-600">
              Maksimal percobaan
            </span>
            <input
              type="number"
              name="maxAttempts"
              min={1}
              max={10}
              defaultValue={3}
              className={inputClass}
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="block text-xs font-bold text-slate-600">
            Instruksi / soal
          </span>
          <textarea
            name="description"
            rows={4}
            maxLength={5000}
            placeholder="Tuliskan instruksi, contoh input/output, dan ketentuan tugas…"
            className={inputClass}
          />
        </label>

        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="text-[11px] font-bold text-emerald-700 underline-offset-2 hover:underline"
        >
          {showAdvanced ? "Sembunyikan" : "Tampilkan"} kode awal &amp; output
          yang diharapkan
        </button>

        <div className={showAdvanced ? "space-y-4" : "hidden"}>
          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-slate-600">
              Kode awal (starter)
            </span>
            <textarea
              name="starterCode"
              rows={6}
              spellCheck={false}
              placeholder={"# Tulis kode awal di sini\n"}
              className={codeClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-slate-600">
              Output yang diharapkan
            </span>
            <textarea
              name="expectedOutput"
              rows={4}
              spellCheck={false}
              placeholder={"Halo, dunia!\n"}
              className={codeClass}
            />
            <span className="block text-[10px] leading-relaxed text-slate-400">
              Auto-grade membandingkan output siswa dengan teks ini (spasi di
              akhir baris dan newline diabaikan). Kosongkan untuk menilai
              manual.
            </span>
          </label>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Tugas berhasil dibuat.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Plus className="h-4 w-4" />
        {pending ? "Menyimpan…" : "Buat Tugas"}
      </button>
    </form>
  );
}
