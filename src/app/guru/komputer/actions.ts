"use server";

import { revalidatePath } from "next/cache";
import { requireGuru } from "@/lib/require-guru";
import { bacaKelasDariForm } from "@/lib/pilih-kelas";
import { jalankan } from "@/lib/db";

// ============================================================================
// Atur target kelas sebuah modul Lab Komputer (kosong = semua kelas).
// ============================================================================

export type HasilKelasKomputer = { message: string | null; sukses: boolean };

export async function simpanKelasKomputer(
  _prevState: HasilKelasKomputer,
  formData: FormData,
): Promise<HasilKelasKomputer> {
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  if (!lessonId) {
    return { message: "Modul tidak ditemukan.", sukses: false };
  }

  const daftarKelasId = bacaKelasDariForm(formData);

  await requireGuru();

  try {
    // Ganti hubungan lama dengan pilihan terbaru.
    await jalankan(`delete from komputer_lesson_classes where lesson_id = $1`, [
      lessonId,
    ]);

    if (daftarKelasId.length > 0) {
      await jalankan(
        `insert into komputer_lesson_classes (lesson_id, kelas_id)
         select $1, unnest($2::uuid[])
         on conflict do nothing`,
        [lessonId, daftarKelasId],
      );
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menyimpan kelas: ${pesan}`, sukses: false };
  }

  revalidatePath("/guru/komputer");
  revalidatePath("/siswa/komputer");

  return { message: null, sukses: true };
}
