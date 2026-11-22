"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Plus, Sparkles } from "@/components/icons";
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

const LAB_PRESET = {
  title: "Remedial: Bukti Peminjaman Alat Laboratorium",
  description: `Buatlah program Python untuk mencetak bukti peminjaman alat laboratorium sekolah.

Program meminta tiga data secara berurutan menggunakan input():
1. Nama peminjam
2. Kelas
3. Nama alat

Tentukan dua data tetap langsung di dalam kode (bukan input):
lokasi = "Laboratorium Komputer"
tanggal = "28 November 2026"
Gunakan variabel lokasi dan tanggal di print(), jangan tulis nilainya langsung.
Cetak nilai dengan pemisah koma, misalnya print("Nama :", nama).

Gunakan contoh input berikut agar output sesuai target:
Dimas
IX B
Mikroskop

Ketentuan:
- Minimal 5 variabel: nama, kelas, alat, lokasi, tanggal.
- Tepat 3 input().
- Variabel nama, kelas, dan alat harus dibuat dari input() dan dipakai di dalam print(). Jangan menulis nilai input langsung sebagai teks.
- Minimal 14 print() dan 14 baris output tidak kosong.
- Tampilkan judul BUKTI PEMINJAMAN ALAT LABORATORIUM, garis pembatas, tata tertib 3 poin, dan pesan penutup.
- Dilarang menggunakan for, while, if, atau else.`,
  starterCode: `# Lengkapi program bukti peminjaman alat laboratorium.
`,
  expectedOutput: `========================================
   BUKTI PEMINJAMAN ALAT LABORATORIUM
========================================
Nama       : Dimas
Kelas      : IX B
Alat       : Mikroskop
Lokasi     : Laboratorium Komputer
Tanggal    : 28 November 2026
----------------------------------------
         TATA TERTIB PEMINJAMAN
----------------------------------------
1. Gunakan alat sesuai petunjuk guru.
2. Jangan memindahkan alat tanpa izin.
3. Kembalikan alat tepat waktu.
----------------------------------------
Simpan bukti ini sebagai tanda peminjaman.
========================================`,
  solutionCode: `nama = input()
kelas = input()
alat = input()

lokasi = "Laboratorium Komputer"
tanggal = "28 November 2026"

print("=" * 40)
print("   BUKTI PEMINJAMAN ALAT LABORATORIUM")
print("=" * 40)
print("Nama       :", nama)
print("Kelas      :", kelas)
print("Alat       :", alat)
print("Lokasi     :", lokasi)
print("Tanggal    :", tanggal)
print("-" * 40)
print("         TATA TERTIB PEMINJAMAN")
print("-" * 40)
print("1. Gunakan alat sesuai petunjuk guru.")
print("2. Jangan memindahkan alat tanpa izin.")
print("3. Kembalikan alat tepat waktu.")
print("-" * 40)
print("Simpan bukti ini sebagai tanda peminjaman.")
print("=" * 40)
`,
  requiredVariables: "nama, kelas, alat, lokasi, tanggal",
  inputVariables: "nama, kelas, alat",
  literalVariables: "lokasi, tanggal",
};

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

  function applyPreset() {
    const form = formRef.current;
    if (!form) return;

    const set = (name: string, value: string) => {
      const field = form.querySelector<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >(`[name="${name}"]`);
      if (!field) return;
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const check = (name: string, checked: boolean) => {
      const field = form.querySelector<HTMLInputElement>(
        `[name="${name}"]`,
      );
      if (!field) return;
      field.checked = checked;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    };

    set("title", LAB_PRESET.title);
    set("jenis", "remedial");
    set("kelasId", "");
    set("dueAt", "");
    set("maxScore", "100");
    set("maxAttempts", "3");
    set("minScore", "75");
    set("description", LAB_PRESET.description);
    set("starterCode", LAB_PRESET.starterCode);
    set("expectedOutput", LAB_PRESET.expectedOutput);
    set("solutionCode", LAB_PRESET.solutionCode);
    set("structureWeight", "40");
    set("exactInputs", "3");
    set("minPrints", "14");
    set("minOutputLines", "14");
    set("requiredVariables", LAB_PRESET.requiredVariables);
    set("inputVariables", LAB_PRESET.inputVariables);
    set("literalVariables", LAB_PRESET.literalVariables);

    check("repeatUntilPass", true);
    check("structureEnabled", true);
    check("forbidLoops", true);
    check("forbidConditionals", true);

    setTargetType("siswa");
    setTargetUserIds([]);
    setShowAdvanced(true);
  }

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

      <button
        type="button"
        onClick={applyPreset}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Preset: Bukti Peminjaman Alat
      </button>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-slate-600">
              KKM / nilai minimal lulus
            </span>
            <input
              type="number"
              name="minScore"
              min={0}
              max={1000}
              placeholder="Contoh: 75"
              className={inputClass}
            />
          </label>

          <label className="flex cursor-pointer items-end gap-2 pb-2">
            <input
              type="checkbox"
              name="repeatUntilPass"
              value="true"
              className="mb-1 h-4 w-4 accent-emerald-600"
            />
            <span className="text-xs font-semibold text-slate-600">
              Ulangi sampai lulus
              <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                Percobaan tidak dibatasi sampai nilai ≥ KKM
              </span>
            </span>
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <input
            type="checkbox"
            name="blockCopyPaste"
            value="true"
            className="mt-0.5 h-4 w-4 accent-emerald-600"
          />
          <span className="text-xs font-semibold text-slate-600">
            Kunci copy/paste di editor
            <span className="mt-0.5 block text-[10px] font-medium leading-relaxed text-slate-400">
              Nonaktifkan copy, cut, paste, dan drag-drop kode saat siswa
              mengerjakan tugas, termasuk di HP.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <input
            type="checkbox"
            name="requireGps"
            value="true"
            defaultChecked
            className="mt-0.5 h-4 w-4 accent-emerald-600"
          />
          <span className="text-xs font-semibold text-slate-600">
            Wajibkan GPS untuk membuka tugas
            <span className="mt-0.5 block text-[10px] font-medium leading-relaxed text-slate-400">
              Siswa harus memberi izin lokasi untuk masuk halaman tugas.
              Lokasi valid 1 jam dan tersimpan di riwayat.
            </span>
          </span>
        </label>

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

          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-slate-600">
              Kunci jawaban (kode)
            </span>
            <textarea
              name="solutionCode"
              rows={8}
              spellCheck={false}
              placeholder={"# Tulis jawaban benar di sini (hanya untuk guru)\n"}
              className={codeClass}
            />
            <span className="block text-[10px] leading-relaxed text-slate-400">
              Hanya ditampilkan di akun guru, tidak dikirim ke halaman siswa.
            </span>
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="structureEnabled"
                value="true"
                className="h-4 w-4 accent-emerald-600"
              />
              <span className="text-xs font-extrabold text-slate-700">
                Aktifkan pemeriksaan struktur
              </span>
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Bobot struktur (%)
                </span>
                <input
                  type="number"
                  name="structureWeight"
                  min={0}
                  max={100}
                  defaultValue={40}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Tepat jumlah input()
                </span>
                <input
                  type="number"
                  name="exactInputs"
                  min={0}
                  max={1000}
                  placeholder="mis. 3"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Minimal print()
                </span>
                <input
                  type="number"
                  name="minPrints"
                  min={0}
                  max={1000}
                  placeholder="mis. 14"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Minimal baris output
                </span>
                <input
                  type="number"
                  name="minOutputLines"
                  min={0}
                  max={1000}
                  placeholder="mis. 14"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Variabel wajib
                </span>
                <input
                  type="text"
                  name="requiredVariables"
                  placeholder="nama, kelas, alat, lokasi, tanggal"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Variabel nilai tetap (string)
                </span>
                <input
                  type="text"
                  name="literalVariables"
                  placeholder="lokasi, tanggal"
                  className={inputClass}
                />
                <span className="block text-[10px] leading-relaxed text-slate-400">
                  Nilai tetap harus dipakai di <code>print()</code>, bukan
                  ditulis langsung sebagai teks.
                </span>
              </label>
            </div>

            <label className="mt-3 block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Variabel dari input()
              </span>
              <input
                type="text"
                name="inputVariables"
                placeholder="nama, kelas, alat"
                className={inputClass}
              />
              <span className="block text-[10px] leading-relaxed text-slate-400">
                Variabel ini wajib dibuat dari <code>input()</code> dan dipakai
                di dalam <code>print()</code>. Nilai input tidak boleh ditulis
                langsung sebagai teks.
              </span>
            </label>

            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  name="forbidLoops"
                  value="true"
                  className="h-3.5 w-3.5 accent-emerald-600"
                />
                Larang for/while
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  name="forbidConditionals"
                  value="true"
                  className="h-3.5 w-3.5 accent-emerald-600"
                />
                Larang if/else
              </label>
            </div>

            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              Semua aturan yang diisi bersifat <strong>wajib</strong>. Jika satu
              aturan gagal, siswa belum lulus meskipun nilai totalnya tinggi.
              Nama variabel harus sama persis, termasuk huruf besar/kecil.
            </p>
          </div>
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
