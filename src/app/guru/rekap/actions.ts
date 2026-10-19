"use server";

import { revalidatePath } from "next/cache";
import { requireGuru } from "@/lib/require-guru";
import { banyakBaris, jalankan, placeholders } from "@/lib/db";
import { hapusBerkas } from "@/lib/berkas";

// ============================================================================
// Reset kegiatan siswa (Tahap 21).
// Guru menghapus pengerjaan siswa untuk satu kegiatan supaya siswa bisa
// mengerjakan ulang. Empat jenis: tugas, ulangan, lab_coding, lab_komputer.
// ============================================================================

export type HasilReset = { message: string | null; berhasil: boolean };

type JenisReset =
  | "tugas"
  | "ulangan"
  | "lab_coding"
  | "lab_coding_modul"
  | "lab_komputer";

const JENIS_VALID: JenisReset[] = [
  "tugas",
  "ulangan",
  "lab_coding",
  "lab_coding_modul",
  "lab_komputer",
];

export async function resetKegiatan(
  _prevState: HasilReset,
  formData: FormData,
): Promise<HasilReset> {
  const jenis = String(formData.get("jenis") ?? "").trim() as JenisReset;
  const siswaId = String(formData.get("siswa_id") ?? "").trim();
  const refId = String(formData.get("ref_id") ?? "").trim();

  if (!siswaId || !refId) {
    return { message: "Data tidak lengkap.", berhasil: false };
  }
  if (!JENIS_VALID.includes(jenis)) {
    return { message: "Jenis kegiatan tidak dikenal.", berhasil: false };
  }

  await requireGuru();

  try {
    if (jenis === "tugas") {
      // Ambil path berkas dulu supaya bisa dihapus dari disk.
      const daftarBerkas = await banyakBaris<{ path: string }>(
        `select f.path
         from assignment_files f
         join assignment_submissions s on s.id = f.submission_id
         where s.tugas_id = $1 and s.siswa_id = $2`,
        [refId, siswaId],
      );

      for (const b of daftarBerkas) await hapusBerkas(b.path);

      // Hapus pengumpulan (baris assignment_files ikut cascade).
      await jalankan(
        `delete from assignment_submissions where tugas_id = $1 and siswa_id = $2`,
        [refId, siswaId],
      );
    }

    if (jenis === "ulangan") {
      // exam_submissions dihapus dulu; exam_answers ikut cascade.
      await jalankan(
        `delete from exam_answers
         where submission_id in (
           select id from exam_submissions where exam_id = $1 and siswa_id = $2
         )`,
        [refId, siswaId],
      );

      await jalankan(
        `delete from exam_submissions where exam_id = $1 and siswa_id = $2`,
        [refId, siswaId],
      );

      // Nilai manual/otomatis + nilai esai + pelacak ikut dibersihkan.
      await jalankan(
        `delete from exam_essay_scores where exam_id = $1 and siswa_id = $2`,
        [refId, siswaId],
      );
      await jalankan(
        `delete from exam_scores where exam_id = $1 and siswa_id = $2`,
        [refId, siswaId],
      );
      await jalankan(
        `delete from exam_probes where exam_id = $1 and siswa_id = $2`,
        [refId, siswaId],
      );
    }

    if (jenis === "lab_coding") {
      await jalankan(
        `delete from coding_submissions where exercise_id = $1 and siswa_id = $2`,
        [refId, siswaId],
      );
    }

    if (jenis === "lab_coding_modul") {
      // Reset satu modul sekaligus: hapus pengerjaan siswa pada semua
      // latihan milik modul itu. Siswa mengulang dari level 1.
      const latihan = await banyakBaris<{ id: string }>(
        `select id from coding_exercises where lesson_id = $1`,
        [refId],
      );

      const daftarLatihanId = latihan.map((baris) => baris.id);

      if (daftarLatihanId.length === 0) {
        return {
          message: "Modul ini belum punya latihan untuk direset.",
          berhasil: false,
        };
      }

      await jalankan(
        `delete from coding_submissions
         where siswa_id = $1
           and exercise_id in (${placeholders(daftarLatihanId.length, 2)})`,
        [siswaId, ...daftarLatihanId],
      );
    }

    if (jenis === "lab_komputer") {
      await jalankan(
        `delete from komputer_hasil where challenge_id = $1 and siswa_id = $2`,
        [refId, siswaId],
      );
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Gagal mereset: ${pesan}`,
      berhasil: false,
    };
  }

  revalidatePath(`/guru/rekap/${siswaId}`);
  revalidatePath("/guru/rekap");
  revalidatePath("/guru/tugas");
  revalidatePath("/guru/ulangan");
  revalidatePath("/guru/lab");
  revalidatePath("/guru/lab/hasil");
  revalidatePath("/guru/komputer/hasil");

  return { message: "Kegiatan siswa berhasil direset.", berhasil: true };
}
