"use server";

import { revalidatePath } from "next/cache";
import { requireGuru } from "@/lib/require-guru";
import { bacaStatusAbsensi, bacaTanggal } from "@/lib/absensi";
import { banyakBaris, jalankan } from "@/lib/db";

export async function simpanAbsensi(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const kelasId = String(formData.get("kelas_id") ?? "").trim();
  const tanggal = bacaTanggal(formData.get("tanggal"));

  if (!kelasId) {
    return { message: "Kelas tidak ditemukan." };
  }

  if (!tanggal) {
    return { message: "Tanggal tidak valid." };
  }

  await requireGuru();

  // Daftar siswa diambil di server — daftar dari klien tidak dipercaya.
  let siswaData: { id: string }[];
  try {
    siswaData = await banyakBaris<{ id: string }>(
      `select id from students where kelas_id = $1`,
      [kelasId],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal memuat siswa: ${pesan}` };
  }

  const statusPerSiswa: [string, string][] = [];
  for (const s of siswaData) {
    const status = bacaStatusAbsensi(formData.get(`status_${s.id}`));
    if (!status) continue;
    statusPerSiswa.push([s.id, status]);
  }

  if (statusPerSiswa.length === 0) {
    return { message: "Tidak ada status yang bisa disimpan." };
  }

  try {
    // Satu statement: kirim status sebagai dua array paralel lalu unnest.
    await jalankan(
      `insert into attendance (kelas_id, siswa_id, tanggal, status, updated_at)
       select $1, d.siswa_id, $2::date, d.status, now()
       from unnest($3::uuid[], $4::text[]) as d(siswa_id, status)
       on conflict (siswa_id, tanggal)
       do update set kelas_id = excluded.kelas_id,
                     status = excluded.status,
                     updated_at = now()`,
      [
        kelasId,
        tanggal,
        statusPerSiswa.map(([id]) => id),
        statusPerSiswa.map(([, status]) => status),
      ],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menyimpan absensi: ${pesan}` };
  }

  revalidatePath("/guru/absensi");
  return { message: null };
}

export async function hapusAbsensiTanggal(formData: FormData) {
  const kelasId = String(formData.get("kelas_id") ?? "").trim();
  const tanggal = bacaTanggal(formData.get("tanggal"));
  if (!kelasId || !tanggal) return;

  await requireGuru();

  try {
    await jalankan(
      `delete from attendance where kelas_id = $1 and tanggal = $2`,
      [kelasId, tanggal],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menghapus absensi:", pesan);
  }

  revalidatePath("/guru/absensi");
}
