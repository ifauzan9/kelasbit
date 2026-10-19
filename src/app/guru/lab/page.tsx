import Link from "next/link";
import { FormKelasLab } from "@/components/form-kelas-lab";
import { banyakBaris } from "@/lib/db";
import { requireGuru } from "@/lib/require-guru";
import { Kartu } from "@/components/ui/kartu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IkonBuku } from "@/components/ui/ikon-siswa";

export default async function GuruLabPage() {
  await requireGuru();

  const [kelasList, lessons, latihan, hubungan] = await Promise.all([
    banyakBaris<{ id: string; nama_kelas: string }>(
      `select id, nama_kelas from classes order by nama_kelas asc`,
    ),
    banyakBaris<{ id: string; judul: string; urutan: number | null }>(
      `select id, judul, urutan from coding_lessons order by urutan asc`,
    ),
    banyakBaris<{ id: string; lesson_id: string }>(
      `select id, lesson_id from coding_exercises`,
    ),
    banyakBaris<{ lesson_id: string; kelas_id: string }>(
      `select lesson_id, kelas_id from coding_lesson_classes`,
    ),
  ]);

  const namaKelas = new Map(kelasList.map((k) => [k.id, k.nama_kelas]));

  // Kelompokkan target kelas per modul.
  const kelasPerLesson = new Map<string, string[]>();
  for (const h of hubungan) {
    const daftar = kelasPerLesson.get(h.lesson_id) ?? [];
    daftar.push(h.kelas_id);
    kelasPerLesson.set(h.lesson_id, daftar);
  }

  const galat: string | null = null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Lab Coding</h1>
        <p className="mt-1 text-sm text-slate-500">
          Atur target kelas modul, lalu lihat hasil pengerjaan siswa.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/guru/lab/hasil"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Lihat Hasil Siswa →
        </Link>
      </div>

      {galat ? (
        <p className="text-sm text-red-600">Gagal memuat modul: {galat}</p>
      ) : null}

      {lessons.length > 0 ? (
        <div className="space-y-3">
          {lessons.map((lesson) => {
            const daftarKelasId = kelasPerLesson.get(lesson.id) ?? [];
            const jumlahLatihan = latihan.filter(
              (l) => l.lesson_id === lesson.id,
            ).length;
            return (
              <Kartu key={lesson.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <IkonBuku className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        {lesson.judul}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {jumlahLatihan} level ·{" "}
                        {daftarKelasId.length === 0
                          ? "Semua kelas"
                          : daftarKelasId
                              .map(
                                (idK) =>
                                  namaKelas.get(idK) ?? "Kelas tak ditemukan",
                              )
                              .join(", ")}
                      </p>
                    </div>
                  </div>
                  <Badge varian="netral">{jumlahLatihan} level</Badge>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <FormKelasLab
                    lessonId={lesson.id}
                    kelasList={kelasList}
                    awalTerpilih={daftarKelasId}
                  />
                </div>
              </Kartu>
            );
          })}
        </div>
      ) : (
        <Kartu>
          <EmptyState
            ikon={<IkonBuku className="h-6 w-6" />}
            judul="Belum ada modul"
            keterangan="Jalankan schema.sql Tahap 17 untuk memuat Modul 1."
          />
        </Kartu>
      )}
    </div>
  );
}
