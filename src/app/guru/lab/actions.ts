"use server";

import { revalidatePath } from "next/cache";
import { requireGuru } from "@/lib/require-guru";
import { bacaKelasDariForm } from "@/lib/pilih-kelas";
import { jalankan } from "@/lib/db";

// ============================================================================
// Atur target kelas sebuah modul lab (kosong = semua kelas).
// ============================================================================

export type HasilKelasLab = { message: string | null; sukses: boolean };

export async function simpanKelasLab(
  _prevState: HasilKelasLab,
  formData: FormData,
): Promise<HasilKelasLab> {
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  if (!lessonId) {
    return { message: "Modul tidak ditemukan.", sukses: false };
  }

  const daftarKelasId = bacaKelasDariForm(formData);

  await requireGuru();

  try {
    // Ganti hubungan lama dengan pilihan terbaru.
    await jalankan(`delete from coding_lesson_classes where lesson_id = $1`, [
      lessonId,
    ]);

    if (daftarKelasId.length > 0) {
      await jalankan(
        `insert into coding_lesson_classes (lesson_id, kelas_id)
         select $1, unnest($2::uuid[])
         on conflict do nothing`,
        [lessonId, daftarKelasId],
      );
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menyimpan kelas: ${pesan}`, sukses: false };
  }

  revalidatePath("/guru/lab");
  revalidatePath("/siswa/lab");

  return { message: null, sukses: true };
}
