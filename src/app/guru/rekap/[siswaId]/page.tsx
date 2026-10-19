import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Kartu, KartuJudul } from "@/components/ui/kartu";
import { EmptyState } from "@/components/ui/empty-state";
import { TombolReset } from "@/components/tombol-reset";
import { TabModul } from "@/components/tab-modul";
import { ProgresBar } from "@/components/ui/progres";
import { banyakBaris, satuBaris } from "@/lib/db";
import { requireGuru } from "@/lib/require-guru";
import { ambilKelasTugas } from "@/lib/tugas";
import { ambilKelasUlangan } from "@/lib/ambil-kelas-ulangan";
import { relevansiKelas } from "@/lib/rekap";

// ============================================================================
// Detail rekap satu siswa — empat seksi kegiatan + tombol reset per kegiatan.
// ============================================================================

function formatWaktu(iso: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(t);
}

function BarisKegiatan({
  judul,
  keterangan,
  badge,
  reset,
}: {
  judul: string;
  keterangan: string;
  badge: ReactNode;
  reset?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{judul}</p>
        <p className="text-xs text-slate-400">{keterangan}</p>
      </div>
      <div className="flex items-center gap-3">
        {badge}
        {reset}
      </div>
    </div>
  );
}

const badgeBelum = <Badge varian="netral">Belum</Badge>;

export default async function DetailRekapPage(
  props: PageProps<"/guru/rekap/[siswaId]">,
) {
  await requireGuru();

  const { siswaId } = await props.params;
  const searchParams = await props.searchParams;
  const modulParam =
    typeof searchParams.modul === "string" ? searchParams.modul : "";

  const [siswa, kelasData, tugasData, tugasKelas, kumpulData] =
    await Promise.all([
      satuBaris<{
        id: string;
        nis: string | null;
        nama_siswa: string;
        kelas_id: string | null;
      }>(`select id, nis, nama_siswa, kelas_id from students where id = $1`, [
        siswaId,
      ]),
      banyakBaris<{ id: string; nama_kelas: string }>(
        `select id, nama_kelas from classes`,
      ),
      banyakBaris<{
        id: string;
        judul: string;
        tenggat: string | null;
      }>(`select id, judul, tenggat from assignments`),
      banyakBaris<{ tugas_id: string; kelas_id: string }>(
        `select tugas_id, kelas_id from assignment_classes`,
      ),
      banyakBaris<{
        tugas_id: string;
        nilai: number | null;
        updated_at: string | null;
      }>(
        `select tugas_id, nilai, updated_at
         from assignment_submissions where siswa_id = $1`,
        [siswaId],
      ),
    ]);

  if (!siswa) {
    notFound();
  }

  const namaKelas = new Map(kelasData.map((k) => [k.id, k.nama_kelas]));
  const kelasSiswa = siswa.kelas_id
    ? (namaKelas.get(siswa.kelas_id) ?? "Kelas tak ditemukan")
    : "Belum ada kelas";

  const [
    ulanganData,
    ulanganKelas,
    nilaiData,
    submitUlanganData,
    lessonLabData,
    lessonLabKelas,
    latihanLabData,
    subLabData,
    lessonKomData,
    lessonKomKelas,
    tantanganKomData,
    hasilKomData,
  ] = await Promise.all([
    banyakBaris<{
      id: string;
      judul: string;
      tanggal: string | null;
      status: "akan" | "sudah" | null;
      kelas_id: string | null;
    }>(`select id, judul, tanggal, status, kelas_id from exams`),
    banyakBaris<{ ulangan_id: string; kelas_id: string }>(
      `select ulangan_id, kelas_id from exam_classes`,
    ),
    banyakBaris<{ exam_id: string; nilai: number | null }>(
      `select exam_id, nilai from exam_scores where siswa_id = $1`,
      [siswaId],
    ),
    banyakBaris<{ exam_id: string; nilai_total: number | null }>(
      `select exam_id, nilai_total from exam_submissions where siswa_id = $1`,
      [siswaId],
    ),
    banyakBaris<{ id: string; judul: string; urutan: number | null }>(
      `select id, judul, urutan from coding_lessons order by urutan asc`,
    ),
    banyakBaris<{ lesson_id: string; kelas_id: string }>(
      `select lesson_id, kelas_id from coding_lesson_classes`,
    ),
    banyakBaris<{
      id: string;
      lesson_id: string;
      level: number | null;
      judul: string;
    }>(
      `select id, lesson_id, level, judul from coding_exercises
       order by level asc`,
    ),
    banyakBaris<{
      exercise_id: string;
      pernah_benar: boolean | null;
      percobaan: number | null;
      updated_at: string | null;
    }>(
      `select exercise_id, pernah_benar, percobaan, updated_at
       from coding_submissions where siswa_id = $1`,
      [siswaId],
    ),
    banyakBaris<{ id: string; judul: string; urutan: number | null }>(
      `select id, judul, urutan from komputer_lessons order by urutan asc`,
    ),
    banyakBaris<{ lesson_id: string; kelas_id: string }>(
      `select lesson_id, kelas_id from komputer_lesson_classes`,
    ),
    banyakBaris<{
      id: string;
      lesson_id: string;
      level: number | null;
      judul: string;
    }>(
      `select id, lesson_id, level, judul from komputer_challenges
       order by level asc`,
    ),
    banyakBaris<{
      challenge_id: string;
      pernah_benar: boolean | null;
      percobaan: number | null;
      skor: number | null;
      updated_at: string | null;
    }>(
      `select challenge_id, pernah_benar, percobaan, skor, updated_at
       from komputer_hasil where siswa_id = $1`,
      [siswaId],
    ),
  ]);

  // Kelompokkan kelas per induk (relasi banyak-ke-banyak).
  function kelasPerInduk<T extends { kelas_id: string }>(
    baris: T[],
    ambilId: (b: T) => string,
  ): Map<string, { kelas_id: string }[]> {
    const peta = new Map<string, { kelas_id: string }[]>();
    for (const b of baris) {
      const id = ambilId(b);
      const daftar = peta.get(id) ?? [];
      daftar.push({ kelas_id: b.kelas_id });
      peta.set(id, daftar);
    }
    return peta;
  }

  const petaKelasTugas = kelasPerInduk(tugasKelas, (b) => b.tugas_id);
  const petaKelasUlangan = kelasPerInduk(ulanganKelas, (b) => b.ulangan_id);
  const petaKelasLab = kelasPerInduk(lessonLabKelas, (b) => b.lesson_id);
  const petaKelasKom = kelasPerInduk(lessonKomKelas, (b) => b.lesson_id);

  // ---------- Tugas ----------
  const mapKumpul = new Map(
    kumpulData.map((s) => [
      s.tugas_id,
      { nilai: s.nilai, updated_at: s.updated_at },
    ]),
  );
  const tugasRelevan = tugasData
    .map((t) => ({
      id: t.id,
      judul: t.judul,
      tenggat: t.tenggat,
      assignment_classes: petaKelasTugas.get(t.id) ?? [],
    }))
    .filter((t) => relevansiKelas(ambilKelasTugas(t), siswa.kelas_id))
    .sort((a, b) => a.judul.localeCompare(b.judul, "id"));

  // ---------- Ulangan ----------
  const mapNilai = new Map(nilaiData.map((n) => [n.exam_id, n.nilai]));
  const mapSubmit = new Map(
    submitUlanganData.map((s) => [
      s.exam_id,
      { nilai_total: s.nilai_total ?? 0 },
    ]),
  );
  const ulanganRelevan = ulanganData
    .map((u) => ({
      id: u.id,
      judul: u.judul,
      tanggal: u.tanggal,
      status: (u.status ?? "sudah") as "akan" | "sudah",
      kelas_id: u.kelas_id,
      exam_classes: petaKelasUlangan.get(u.id) ?? [],
    }))
    .filter((u) => relevansiKelas(ambilKelasUlangan(u), siswa.kelas_id))
    .sort((a, b) => a.judul.localeCompare(b.judul, "id"));

  // ---------- Lab Coding ----------
  const lessonLab = lessonLabData.map((l) => ({
    id: l.id,
    judul: l.judul,
    urutan: l.urutan ?? 0,
    coding_lesson_classes: petaKelasLab.get(l.id) ?? [],
  }));
  const mapLessonLab = new Map(lessonLab.map((l) => [l.id, l]));
  const mapSubLab = new Map(
    subLabData.map((s) => [
      s.exercise_id,
      {
        pernah_benar: s.pernah_benar === true,
        percobaan: s.percobaan ?? 0,
        updated_at: s.updated_at,
      },
    ]),
  );
  const latihanRelevan = latihanLabData
    .map((l) => ({
      id: l.id,
      lesson_id: l.lesson_id,
      level: l.level ?? 0,
      judul: l.judul,
    }))
    .filter((l) => {
      const lesson = mapLessonLab.get(l.lesson_id);
      if (!lesson) return false;
      return relevansiKelas(
        (lesson.coding_lesson_classes ?? []).map((k) => k.kelas_id),
        siswa.kelas_id,
      );
    })
    .sort((a, b) => {
      const ua = mapLessonLab.get(a.lesson_id)?.urutan ?? 0;
      const ub = mapLessonLab.get(b.lesson_id)?.urutan ?? 0;
      if (ua !== ub) return ua - ub;
      return a.level - b.level;
    });

  // Kelompokkan latihan per modul (hanya modul yang relevan & punya latihan).
  // "Dikerjakan" mengikuti definisi kartu ringkasan di atas: sudah ada baris
  // coding_submissions untuk level tersebut.
  const modulLab = lessonLab
    .filter((lesson) =>
      relevansiKelas(
        (lesson.coding_lesson_classes ?? []).map((k) => k.kelas_id),
        siswa.kelas_id,
      ),
    )
    .sort((a, b) => a.urutan - b.urutan)
    .map((lesson) => {
      const levels = latihanRelevan.filter((l) => l.lesson_id === lesson.id);
      return {
        id: lesson.id,
        judul: lesson.judul,
        levels,
        selesai: levels.filter((l) => mapSubLab.has(l.id)).length,
        total: levels.length,
      };
    })
    .filter((modul) => modul.total > 0);

  // Modul yang sedang dibuka. Parameter tidak dikenal → modul pertama.
  const modulAktif =
    modulLab.find((modul) => modul.id === modulParam) ?? modulLab[0] ?? null;

  // ---------- Lab Komputer ----------
  const lessonKom = lessonKomData.map((l) => ({
    id: l.id,
    judul: l.judul,
    urutan: l.urutan ?? 0,
    komputer_lesson_classes: petaKelasKom.get(l.id) ?? [],
  }));
  const mapLessonKom = new Map(lessonKom.map((l) => [l.id, l]));
  const mapHasilKom = new Map(
    hasilKomData.map((h) => [
      h.challenge_id,
      {
        pernah_benar: h.pernah_benar === true,
        percobaan: h.percobaan ?? 0,
        skor: h.skor,
        updated_at: h.updated_at,
      },
    ]),
  );
  const tantanganRelevan = tantanganKomData
    .map((t) => ({
      id: t.id,
      lesson_id: t.lesson_id,
      level: t.level ?? 0,
      judul: t.judul,
    }))
    .filter((t) => {
      const lesson = mapLessonKom.get(t.lesson_id);
      if (!lesson) return false;
      return relevansiKelas(
        (lesson.komputer_lesson_classes ?? []).map((k) => k.kelas_id),
        siswa.kelas_id,
      );
    })
    .sort((a, b) => {
      const ua = mapLessonKom.get(a.lesson_id)?.urutan ?? 0;
      const ub = mapLessonKom.get(b.lesson_id)?.urutan ?? 0;
      if (ua !== ub) return ua - ub;
      return a.level - b.level;
    });

  // ---------- Ringkasan angka ----------
  const tugasSelesai = tugasRelevan.filter((t) => mapKumpul.has(t.id)).length;
  const ulanganSelesai = ulanganRelevan.filter(
    (u) => mapNilai.has(u.id) || mapSubmit.has(u.id),
  ).length;
  const labCodingSelesai = latihanRelevan.filter((l) =>
    mapSubLab.has(l.id),
  ).length;
  const labKomputerSelesai = tantanganRelevan.filter((t) =>
    mapHasilKom.has(t.id),
  ).length;

  const ringkasan = [
    { label: "Tugas", selesai: tugasSelesai, total: tugasRelevan.length },
    { label: "Ulangan", selesai: ulanganSelesai, total: ulanganRelevan.length },
    { label: "Lab Coding", selesai: labCodingSelesai, total: latihanRelevan.length },
    {
      label: "Lab Komputer",
      selesai: labKomputerSelesai,
      total: tantanganRelevan.length,
    },
  ];

  const galat: string | null = null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/guru/rekap"
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Kembali ke Rekap Siswa
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {siswa.nama_siswa}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {siswa.nis ? `NIS ${siswa.nis} · ` : ""}
          {kelasSiswa}
        </p>
      </div>

      {galat ? (
        <p className="text-sm text-red-600">Gagal memuat data: {galat}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ringkasan.map((r) => (
          <div
            key={r.label}
            className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {r.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {r.selesai}/{r.total}
            </p>
          </div>
        ))}
      </div>

      {/* ---------- Tugas ---------- */}
      <Kartu>
        <KartuJudul
          judul="Tugas"
          subjudul={`${tugasSelesai} dari ${tugasRelevan.length} tugas dikumpulkan`}
        />
        {tugasRelevan.length > 0 ? (
          <div className="mt-4 space-y-2">
            {tugasRelevan.map((t) => {
              const sub = mapKumpul.get(t.id);
              return (
                <BarisKegiatan
                  key={t.id}
                  judul={t.judul}
                  keterangan={`Tenggat: ${formatWaktu(t.tenggat)}`}
                  badge={
                    sub ? (
                      <Badge varian="sukses" titik>
                        {sub.nilai === null
                          ? "Dikumpulkan"
                          : `Nilai ${sub.nilai}`}
                      </Badge>
                    ) : (
                      badgeBelum
                    )
                  }
                  reset={
                    sub ? (
                      <TombolReset
                        jenis="tugas"
                        siswaId={siswa.id}
                        refId={t.id}
                        label={t.judul}
                      />
                    ) : null
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState padat judul="Belum ada tugas untuk kelas ini" />
        )}
      </Kartu>

      {/* ---------- Ulangan ---------- */}
      <Kartu>
        <KartuJudul
          judul="Ulangan"
          subjudul={`${ulanganSelesai} dari ${ulanganRelevan.length} ulangan dikerjakan`}
        />
        {ulanganRelevan.length > 0 ? (
          <div className="mt-4 space-y-2">
            {ulanganRelevan.map((u) => {
              const nilai = mapNilai.get(u.id);
              const sub = mapSubmit.get(u.id);
              const nilaiTampil = nilai ?? sub?.nilai_total ?? null;
              const dikerjakan = nilai !== undefined || sub !== undefined;
              return (
                <BarisKegiatan
                  key={u.id}
                  judul={u.judul}
                  keterangan={`${formatWaktu(u.tanggal)} · ${
                    u.status === "akan" ? "Online" : "Manual"
                  }`}
                  badge={
                    dikerjakan ? (
                      <Badge varian="sukses" titik>
                        {nilaiTampil === null
                          ? "Dikerjakan"
                          : `Nilai ${nilaiTampil}`}
                      </Badge>
                    ) : (
                      badgeBelum
                    )
                  }
                  reset={
                    dikerjakan ? (
                      <TombolReset
                        jenis="ulangan"
                        siswaId={siswa.id}
                        refId={u.id}
                        label={u.judul}
                      />
                    ) : null
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState padat judul="Belum ada ulangan untuk kelas ini" />
        )}
      </Kartu>

      {/* ---------- Lab Coding ---------- */}
      <Kartu>
        <KartuJudul
          judul="Lab Coding"
          subjudul={`${labCodingSelesai} dari ${latihanRelevan.length} level dikerjakan`}
          aksi={
            modulAktif && modulAktif.selesai > 0 ? (
              <TombolReset
                jenis="lab_coding_modul"
                siswaId={siswa.id}
                refId={modulAktif.id}
                label={modulAktif.judul}
                varian="outline"
                teks="Reset modul"
                konfirmasi={`Yakin reset seluruh modul "${modulAktif.judul}"? ${modulAktif.selesai} level yang sudah dikerjakan akan dihapus dan siswa mengulang modul ini dari level 1.`}
              />
            ) : null
          }
        />

        {modulAktif ? (
          <>
            <TabModul
              daftar={modulLab.map((modul) => ({
                id: modul.id,
                judul: modul.judul,
                selesai: modul.selesai,
                total: modul.total,
              }))}
              aktifId={modulAktif.id}
              basePath={`/guru/rekap/${siswa.id}`}
            />

            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                  {modulAktif.judul}
                </p>
                <Badge
                  varian={
                    modulAktif.selesai === modulAktif.total ? "sukses" : "netral"
                  }
                >
                  {modulAktif.selesai === modulAktif.total ? "✓ Tuntas · " : ""}
                  {modulAktif.selesai}/{modulAktif.total} level
                </Badge>
              </div>
              <ProgresBar
                nilai={Math.round(
                  (modulAktif.selesai / modulAktif.total) * 100,
                )}
                label={`Progres ${modulAktif.judul}`}
                ukuran="sm"
                className="mt-3"
              />
            </div>

            <div className="mt-3 space-y-2">
              {modulAktif.levels.map((l) => {
                const sub = mapSubLab.get(l.id);
                return (
                  <BarisKegiatan
                    key={l.id}
                    judul={`Level ${l.level}: ${l.judul}`}
                    keterangan={
                      sub
                        ? `${sub.percobaan} percobaan · ${formatWaktu(sub.updated_at)}`
                        : "Belum dikerjakan"
                    }
                    badge={
                      sub ? (
                        <Badge varian={sub.pernah_benar ? "sukses" : "bahaya"}>
                          {sub.pernah_benar ? "Pernah benar" : "Belum benar"}
                        </Badge>
                      ) : (
                        badgeBelum
                      )
                    }
                    reset={
                      sub ? (
                        <TombolReset
                          jenis="lab_coding"
                          siswaId={siswa.id}
                          refId={l.id}
                          label={`Level ${l.level}: ${l.judul}`}
                        />
                      ) : null
                    }
                  />
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState padat judul="Belum ada latihan untuk kelas ini" />
        )}
      </Kartu>

      {/* ---------- Lab Komputer ---------- */}
      <Kartu>
        <KartuJudul
          judul="Lab Komputer"
          subjudul={`${labKomputerSelesai} dari ${tantanganRelevan.length} tantangan dikerjakan`}
        />
        {tantanganRelevan.length > 0 ? (
          <div className="mt-4 space-y-2">
            {tantanganRelevan.map((t) => {
              const hasil = mapHasilKom.get(t.id);
              const lesson = mapLessonKom.get(t.lesson_id);
              return (
                <BarisKegiatan
                  key={t.id}
                  judul={`${lesson?.judul ?? "Modul"} — Level ${t.level}: ${t.judul}`}
                  keterangan={
                    hasil
                      ? `${hasil.percobaan} percobaan${
                          hasil.skor != null ? ` · skor ${hasil.skor}` : ""
                        } · ${formatWaktu(hasil.updated_at)}`
                      : "Belum dikerjakan"
                  }
                  badge={
                    hasil ? (
                      <Badge varian={hasil.pernah_benar ? "sukses" : "bahaya"}>
                        {hasil.pernah_benar ? "Pernah benar" : "Belum benar"}
                      </Badge>
                    ) : (
                      badgeBelum
                    )
                  }
                  reset={
                    hasil ? (
                      <TombolReset
                        jenis="lab_komputer"
                        siswaId={siswa.id}
                        refId={t.id}
                        label={t.judul}
                      />
                    ) : null
                  }
                />
              );
            })}
          </div>
        ) : (
          <EmptyState padat judul="Belum ada tantangan untuk kelas ini" />
        )}
      </Kartu>
    </div>
  );
}
