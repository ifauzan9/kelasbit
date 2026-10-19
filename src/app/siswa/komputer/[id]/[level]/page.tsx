import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSiswa } from "@/lib/sesi-siswa";
import { banyakBaris, placeholders, satuBaris } from "@/lib/db";
import { TantanganKomputer, type Konfigurasi } from "@/components/tantangan-komputer";
import { PetaLevel } from "@/components/peta-level";

type TantanganRow = {
  id: string;
  level: number;
  judul: string;
  jenis: string;
  penjelasan: string;
  contoh: string | null;
  instruksi: string;
  konfigurasi: Record<string, unknown>;
  poin: number;
};

export default async function LevelKomputerSiswaPage(
  props: PageProps<"/siswa/komputer/[id]/[level]">,
) {
  const { id, level } = await props.params;
  const levelNum = Number(level);
  if (!Number.isInteger(levelNum) || levelNum < 1) notFound();

  const { siswa } = await requireSiswa();

  const lessonData = await satuBaris<{ id: string; judul: string }>(
    `select id, judul from komputer_lessons where id = $1`,
    [id],
  );

  if (!lessonData) redirect("/siswa/komputer");

  const lesson = lessonData;

  const hubungan = await banyakBaris<{ kelas_id: string }>(
    `select kelas_id from komputer_lesson_classes where lesson_id = $1`,
    [id],
  );

  const daftarKelasId = hubungan.map((hub) => hub.kelas_id);
  const relevan =
    daftarKelasId.length === 0 ||
    (siswa.kelas_id !== null && daftarKelasId.includes(siswa.kelas_id));

  if (!relevan) redirect("/siswa/komputer");

  const tantanganData = await banyakBaris<{
    id: string;
    level: number | null;
    judul: string;
    jenis: string | null;
    penjelasan: string | null;
    contoh: string | null;
    instruksi: string | null;
    konfigurasi: Record<string, unknown> | string | null;
    poin: number | null;
  }>(
    `select id, level, judul, jenis, penjelasan, contoh, instruksi,
            konfigurasi, poin
     from komputer_challenges where lesson_id = $1 order by level asc`,
    [id],
  );

  // `konfigurasi` bisa tersimpan sebagai jsonb (objek) atau teks JSON.
  function bacaKonfigurasi(
    nilai: Record<string, unknown> | string | null,
  ): Record<string, unknown> {
    if (!nilai) return {};
    if (typeof nilai === "object") return nilai;
    try {
      const hasil = JSON.parse(nilai);
      return hasil && typeof hasil === "object" ? hasil : {};
    } catch {
      return {};
    }
  }

  const tantangan: TantanganRow[] = tantanganData.map((row) => ({
    id: row.id,
    level: row.level ?? 0,
    judul: row.judul,
    jenis: row.jenis ?? "klik",
    penjelasan: row.penjelasan ?? "",
    contoh: row.contoh,
    instruksi: row.instruksi ?? "",
    konfigurasi: bacaKonfigurasi(row.konfigurasi),
    poin: row.poin ?? 0,
  }));

  const aktif = tantangan.find((t) => t.level === levelNum);
  if (!aktif) notFound();

  const challengeIds = tantangan.map((t) => t.id);
  let hasil: {
    challenge_id: string;
    benar: boolean;
    pernah_benar: boolean;
    percobaan: number;
  }[] = [];
  if (challengeIds.length > 0) {
    const data = await banyakBaris<{
      challenge_id: string;
      benar: boolean | null;
      pernah_benar: boolean | null;
      percobaan: number | null;
    }>(
      `select challenge_id, benar, pernah_benar, percobaan
       from komputer_hasil
       where siswa_id = $1
         and challenge_id in (${placeholders(challengeIds.length, 2)})`,
      [siswa.id, ...challengeIds],
    );
    hasil = data.map((row) => ({
      challenge_id: row.challenge_id,
      benar: row.benar === true,
      pernah_benar: row.pernah_benar === true,
      percobaan: row.percobaan ?? 0,
    }));
  }

  const petaHasil = new Map(hasil.map((h) => [h.challenge_id, h]));
  const hasilAktif = petaHasil.get(aktif.id) ?? null;

  const selesai = tantangan
    .filter((t) => petaHasil.get(t.id)?.pernah_benar === true)
    .map((t) => t.level);
  const dikerjakan = tantangan
    .filter((t) => petaHasil.has(t.id))
    .map((t) => t.level);

  const total = tantangan.length;
  const berikutLevel = levelNum < total ? levelNum + 1 : null;
  const sebelumLevel = levelNum > 1 ? levelNum - 1 : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/siswa/komputer/${id}`}
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← {lesson.judul}
        </Link>
      </div>

      <PetaLevel
        lessonId={id}
        basePath="/siswa/komputer"
        levels={tantangan.map((t) => ({ level: t.level, judul: t.judul }))}
        selesai={selesai}
        dikerjakan={dikerjakan}
        aktif={levelNum}
      />

      <TantanganKomputer
        challengeId={aktif.id}
        jenis={aktif.jenis}
        konfigurasi={aktif.konfigurasi as unknown as Konfigurasi}
        judul={aktif.judul}
        level={aktif.level}
        penjelasan={aktif.penjelasan}
        contoh={aktif.contoh}
        instruksi={aktif.instruksi}
        poin={aktif.poin}
        lessonId={id}
        berikutLevel={berikutLevel}
        pernahBenarAwal={hasilAktif?.pernah_benar ?? false}
        percobaanAwal={hasilAktif?.percobaan ?? 0}
      />

      <div className="flex items-center justify-between gap-3">
        {sebelumLevel ? (
          <Link
            href={`/siswa/komputer/${id}/${sebelumLevel}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            ← Level {sebelumLevel}
          </Link>
        ) : (
          <span />
        )}
        {berikutLevel ? (
          <Link
            href={`/siswa/komputer/${id}/${berikutLevel}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Level {berikutLevel} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
