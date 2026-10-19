import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSiswa } from "@/lib/sesi-siswa";
import { banyakBaris, placeholders, satuBaris } from "@/lib/db";
import { LabRunner } from "@/components/lab-runner";
import { PetaLevel } from "@/components/peta-level";
import { HeroSiswa } from "@/components/ui/hero-siswa";
import { ProgresBar } from "@/components/ui/progres";
import { IkonLab } from "@/components/ui/ikon-siswa";
import { hitungLevelTerkunci } from "@/lib/lab";

type LatihanRow = {
  id: string;
  level: number;
  judul: string;
  penjelasan: string;
  contoh_kode: string | null;
  instruksi: string;
  kode_awal: string | null;
  keluaran_diharapkan: string;
  poin: number;
  jenis: string;
  masukan: string | null;
  masukan_uji: string | null;
  aturan: {
    variabel_wajib?: string[];
    final_boss?: boolean;
    badge?: string;
  } | null;
};

type HasilRow = {
  exercise_id: string;
  kode: string;
  benar: boolean;
  pernah_benar: boolean;
  percobaan: number;
};

// Bentuk mentah baris tabel coding_exercises (kolom bisa null).
type LatihanRowTabel = {
  id: string;
  level: number | null;
  judul: string;
  penjelasan: string | null;
  contoh_kode: string | null;
  instruksi: string | null;
  kode_awal: string | null;
  keluaran_diharapkan: string | null;
  poin: number | null;
  jenis: string | null;
  aturan: string | Record<string, unknown> | null;
  masukan: string | null;
  masukan_uji: string | null;
};

// Kolom `aturan` tersimpan sebagai jsonb (objek) — longgarkan tipenya.
function bacaAturanLatihan(
  nilai: string | Record<string, unknown> | null,
): LatihanRow["aturan"] {
  if (!nilai) return null;
  if (typeof nilai === "object") return nilai as LatihanRow["aturan"];
  try {
    const hasil = JSON.parse(nilai);
    return hasil && typeof hasil === "object"
      ? (hasil as LatihanRow["aturan"])
      : null;
  } catch {
    return null;
  }
}

// Input wajib disimpan satu baris per input(). Baris kosong di akhir dibuang.
function pecahMasukan(teks: string | null): string[] {
  if (!teks) return [];
  const baris = teks.replace(/\r\n/g, "\n").split("\n");
  while (baris.length > 0 && baris[baris.length - 1].trim() === "") baris.pop();
  return baris;
}

export default async function LevelLabSiswaPage(
  props: PageProps<"/siswa/lab/[id]/[level]">,
) {
  const { id, level } = await props.params;
  const levelNum = Number(level);
  if (!Number.isInteger(levelNum) || levelNum < 1) notFound();

  const { siswa } = await requireSiswa();

  const lessonData = await satuBaris<{
    id: string;
    judul: string;
    isi: string | null;
  }>(`select id, judul, isi from coding_lessons where id = $1`, [id]);

  if (!lessonData) redirect("/siswa/lab");

  const lesson = lessonData;

  const hubungan = await banyakBaris<{ kelas_id: string }>(
    `select kelas_id from coding_lesson_classes where lesson_id = $1`,
    [id],
  );

  const daftarKelasId = hubungan.map((hub) => hub.kelas_id);
  const relevan =
    daftarKelasId.length === 0 ||
    (siswa.kelas_id !== null && daftarKelasId.includes(siswa.kelas_id));

  if (!relevan) redirect("/siswa/lab");

  // Semua kolom latihan diambil sekaligus; kolom opsional (masukan, masukan_uji)
  // diisi null kalau belum ada di database.
  const latihanData = await banyakBaris<LatihanRowTabel>(
    `select id, level, judul, penjelasan, contoh_kode, instruksi, kode_awal,
            keluaran_diharapkan, poin, jenis, aturan, masukan, masukan_uji
     from coding_exercises where lesson_id = $1 order by level asc`,
    [id],
  );

  const latihan: LatihanRow[] = latihanData.map((row) => ({
    id: row.id,
    level: row.level ?? 0,
    judul: row.judul,
    penjelasan: row.penjelasan ?? "",
    contoh_kode: row.contoh_kode,
    instruksi: row.instruksi ?? "",
    kode_awal: row.kode_awal,
    keluaran_diharapkan: row.keluaran_diharapkan ?? "",
    poin: row.poin ?? 0,
    jenis: row.jenis ?? "input",
    masukan: row.masukan,
    masukan_uji: row.masukan_uji,
    aturan: bacaAturanLatihan(row.aturan),
  }));

  const exercise = latihan.find((item) => item.level === levelNum);
  if (!exercise) notFound();

  // Ambil hasil siswa untuk semua level (untuk warna menu & status).
  const exerciseIds = latihan.map((item) => item.id);
  let hasil: HasilRow[] = [];
  if (exerciseIds.length > 0) {
    const data = await banyakBaris<HasilRow>(
      `select exercise_id, kode, benar, pernah_benar, percobaan
       from coding_submissions
       where siswa_id = $1 and exercise_id in (${placeholders(exerciseIds.length)})`,
      [siswa.id, ...exerciseIds],
    );
    hasil = data.map((row) => ({
      exercise_id: row.exercise_id,
      kode: row.kode ?? "",
      benar: row.benar === true,
      pernah_benar: row.pernah_benar === true,
      percobaan: row.percobaan ?? 0,
    }));
  }

  const petaHasil = new Map(hasil.map((item) => [item.exercise_id, item]));
  const submission = petaHasil.get(exercise.id) ?? null;

  const selesai = latihan
    .filter((item) => petaHasil.get(item.id)?.pernah_benar === true)
    .map((item) => item.level);
  const dikerjakan = latihan
    .filter((item) => petaHasil.has(item.id))
    .map((item) => item.level);

  // Kunci berurutan ditentukan server: level N terkunci sampai N-1 benar.
  const levelTerkunci = hitungLevelTerkunci(
    latihan.map((item) => item.level),
    new Set(selesai),
  );

  // Kunci ketat: level terkunci tidak bisa dibuka walau lewat URL langsung.
  if (levelTerkunci.includes(levelNum)) {
    redirect(`/siswa/lab/${id}`);
  }

  const total = latihan.length;
  const adaSebelum = levelNum > 1;
  const adaSesudah = levelNum < total;
  const barisMasukan = pecahMasukan(exercise.masukan);

  // Nama variabel yang dinilai pada tantangan ini. Untuk karya bebas
  // (level 15) daftar wajib kosong, jadi nama diambil dari instruksi lewat
  // pola "variabel bernama x" / "Simpan menggunakan variabel x".
  const variabelDiminta: string[] = (() => {
    const wajib = exercise.aturan?.variabel_wajib ?? [];
    if (wajib.length > 0) return wajib;
    if (exercise.jenis !== "bebas") return [];
    const cocok = [
      ...exercise.instruksi.matchAll(
        /variabel\s+(?:bernama\s+)?`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi,
      ),
    ].map((m) => m[1]);
    return [...new Set(cocok)];
  })();

  return (
    <div className="space-y-6">
      <HeroSiswa
        atas={
          <Link
            href={`/siswa/lab/${id}`}
            className="inline-flex items-center text-sm font-medium text-emerald-100 transition hover:text-white"
          >
            ← {lesson.judul}
          </Link>
        }
        label={`Tantangan ${exercise.level}`}
        judul={exercise.judul}
        subjudul="Tulis programmu sendiri. Jalankan untuk melihat hasil, lalu cocokkan dengan target."
        ikon={
          exercise.aturan?.final_boss ? (
            <span className="text-xl" aria-hidden="true">
              ⭐
            </span>
          ) : (
            <span className="text-lg font-bold tabular-nums">
              {exercise.level}
            </span>
          )
        }
        aksi={
          <>
            {exercise.aturan?.final_boss ? (
              <span className="inline-flex items-center rounded-full bg-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950 ring-1 ring-amber-200">
                ⭐ FINAL BOSS
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25">
              {exercise.poin} XP
            </span>
            {submission?.pernah_benar ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700">
                ✓ Sudah benar
              </span>
            ) : null}
          </>
        }
      >
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm text-emerald-50">
            <span>
              Level {exercise.level} dari {total}
            </span>
            <span className="font-semibold text-white">
              {selesai.length}/{total} benar
            </span>
          </div>
          <ProgresBar
            nilai={total > 0 ? Math.round((selesai.length / total) * 100) : 0}
            label={`Progres modul ${selesai.length} dari ${total} level`}
            warna="putih"
            ukuran="sm"
            className="mt-2"
          />
        </div>
      </HeroSiswa>

      <PetaLevel
        lessonId={id}
        levels={latihan.map((item) => ({
          level: item.level,
          judul: item.judul,
        }))}
        selesai={selesai}
        dikerjakan={dikerjakan}
        aktif={levelNum}
        terkunci={levelTerkunci}
      />

      <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-emerald-100 bg-emerald-50/70 px-5 py-4 sm:px-6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <IkonLab className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">
              Tantangan {exercise.level}
            </p>
            <h2 className="text-lg font-semibold text-slate-950">
              Apa yang perlu dibuat?
            </h2>
          </div>
        </div>
        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="max-w-3xl whitespace-pre-wrap text-base leading-7 text-slate-800">
            {exercise.instruksi}
          </div>

          {barisMasukan.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {exercise.jenis === "bebas" ? "Contoh input" : "Input wajib"}
                </h3>
                <p className="text-xs text-slate-500">
                  {exercise.jenis === "bebas"
                    ? "Pakai minimal 5 baris pertama saat modal input muncul."
                    : "Tulis saat modal input muncul, satu per satu."}
                </p>
              </div>
              <ol className="mt-3 space-y-1.5">
                {barisMasukan.map((isi, urutan) => (
                  <li key={urutan} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-[11px] font-semibold text-slate-600">
                      {urutan + 1}
                    </span>
                    <code className="font-mono text-sm break-words text-slate-900">
                      {isi === "" ? "(kosong)" : isi}
                    </code>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                {exercise.jenis === "bebas" ? (
                  <>
                    Pakai minimal 5 baris pertama. Baris sisanya cadangan kalau
                    programmu meminta lebih banyak masukan.
                  </>
                ) : (
                  <>
                    Saat menekan Run Python, muncul jendela input satu per
                    satu. Ketik nilainya persis seperti daftar ini dengan
                    urutan yang sama. Kamu boleh menulis{" "}
                    <code className="font-mono">input(&quot;Nama: &quot;)</code>{" "}
                    — teks pertanyaannya hanya tampil di jendela input, tidak
                    ikut menjadi output.
                  </>
                )}
              </p>
            </div>
          ) : null}

          {exercise.jenis !== "bebas" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-emerald-900">
                  Target output
                </h3>
                <p className="text-xs text-emerald-700/80">
                  Gunakan sebagai acuan, jangan disalin.
                </p>
              </div>
              <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-sm leading-6 text-emerald-100 select-none whitespace-pre-wrap">
                {exercise.keluaran_diharapkan}
              </pre>
            </div>
          ) : null}

          {variabelDiminta.length > 0 ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-indigo-950">
                  Variabel yang diminta
                </h3>
                <p className="text-xs text-indigo-800/70">
                  Nama harus sama persis
                </p>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {variabelDiminta.map((nama, urutan) => (
                  <li
                    key={nama}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 shadow-sm"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                      {urutan + 1}
                    </span>
                    <code className="font-mono text-sm font-semibold text-indigo-950">
                      {nama}
                    </code>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-indigo-900/80">
                Buat variabel dengan nama di atas, isi dari{" "}
                <code className="font-mono">input()</code>, lalu tampilkan dengan{" "}
                <code className="font-mono">print()</code>. Penilaian mengecek
                nama, isi dari input, dan urutannya.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <LabRunner
        exerciseId={exercise.id}
        kodeAwal={exercise.kode_awal}
        keluaranDiharapkan={exercise.keluaran_diharapkan}
        kodeTersimpan={submission?.kode ?? null}
        percobaanAwal={submission?.percobaan ?? 0}
        pernahBenarAwal={submission?.pernah_benar ?? false}
        judul={exercise.judul}
        levelNumber={exercise.level}
        instruksi={exercise.instruksi}
        jenis={exercise.jenis}
        bantuan={lesson.isi}
        wajibVariabel={exercise.aturan?.variabel_wajib ?? []}
        finalBoss={exercise.aturan?.final_boss ?? false}
        badge={exercise.aturan?.badge ?? null}
        contoh={exercise.contoh_kode}
        masukan={exercise.masukan ?? ""}
        punyaUji={Boolean(exercise.masukan_uji?.trim())}
      />

      <div className="flex items-center justify-between gap-3">
        {adaSebelum ? (
          <Link
            href={`/siswa/lab/${id}/${levelNum - 1}`}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            ← Level {levelNum - 1}
          </Link>
        ) : (
          <span />
        )}
        {adaSesudah && submission?.pernah_benar ? (
          <Link
            href={`/siswa/lab/${id}/${levelNum + 1}`}
            className="inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            Level {levelNum + 1} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
