"use server";

import { revalidatePath } from "next/cache";
import { requireGuru } from "@/lib/require-guru";
import { bacaKelasDariForm } from "@/lib/pilih-kelas";
import { parseWaktuMulai } from "@/lib/jadwal-pengumuman";
import { banyakBaris, jalankan } from "@/lib/db";

const MAX_JUDUL = 200;
const MAX_ISI = 5000;

async function simpanKelas(pengumumanId: string, daftarKelasId: string[]) {
  // Kosongkan dulu hubungan lama, baru isi ulang dengan pilihan terbaru
  // (update = hapus + sisipkan, karena relasi banyak-ke-banyak).
  await jalankan(`delete from announcement_classes where pengumuman_id = $1`, [
    pengumumanId,
  ]);

  if (daftarKelasId.length === 0) {
    // "Semua kelas" = tidak ada baris hubungan
    return;
  }

  await jalankan(
    `insert into announcement_classes (pengumuman_id, kelas_id)
     select $1, unnest($2::uuid[])
     on conflict do nothing`,
    [pengumumanId, daftarKelasId],
  );
}

export async function addPengumuman(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const judul = String(formData.get("judul") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();
  const daftarKelasId = bacaKelasDariForm(formData);
  const mulai = parseWaktuMulai(String(formData.get("mulai_pada") ?? ""));

  if (!judul) {
    return { message: "Judul wajib diisi." };
  }

  if (judul.length > MAX_JUDUL) {
    return { message: `Judul maksimal ${MAX_JUDUL} karakter.` };
  }

  if (!isi) {
    return { message: "Isi pengumuman wajib diisi." };
  }

  if (isi.length > MAX_ISI) {
    return { message: `Isi pengumuman maksimal ${MAX_ISI} karakter.` };
  }

  if (!mulai.ok) {
    return { message: "Format waktu mulai tampil tidak valid." };
  }

  await requireGuru();

  let idBaru: string;
  try {
    const data = await banyakBaris<{ id: string }>(
      `insert into announcements (judul, isi, mulai_pada)
       values ($1, $2, $3)
       returning id`,
      [judul, isi, mulai.iso],
    );
    idBaru = data[0].id;
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menambah pengumuman: ${pesan}` };
  }

  try {
    await simpanKelas(idBaru, daftarKelasId);
  } catch (err) {
    // Rollback sederhana: pengumuman baru hapus juga kalau hubungannya gagal
    await jalankan(`delete from announcements where id = $1`, [idBaru]).catch(
      () => {},
    );
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Pengumuman tersimpan, tapi gagal mengatur kelasnya (${pesan}).`,
    };
  }

  revalidatePath("/guru/pengumuman");
  return { message: null };
}

export async function updatePengumuman(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const id = String(formData.get("id") ?? "");
  const judul = String(formData.get("judul") ?? "").trim();
  const isi = String(formData.get("isi") ?? "").trim();
  const daftarKelasId = bacaKelasDariForm(formData);
  const mulai = parseWaktuMulai(String(formData.get("mulai_pada") ?? ""));

  if (!id) {
    return { message: "Data pengumuman tidak ditemukan." };
  }

  if (!judul) {
    return { message: "Judul wajib diisi." };
  }

  if (judul.length > MAX_JUDUL) {
    return { message: `Judul maksimal ${MAX_JUDUL} karakter.` };
  }

  if (!isi) {
    return { message: "Isi pengumuman wajib diisi." };
  }

  if (isi.length > MAX_ISI) {
    return { message: `Isi pengumuman maksimal ${MAX_ISI} karakter.` };
  }

  if (!mulai.ok) {
    return { message: "Format waktu mulai tampil tidak valid." };
  }

  await requireGuru();

  let jumlahDiubah: number;
  try {
    jumlahDiubah = await jalankan(
      `update announcements set judul = $1, isi = $2, mulai_pada = $3 where id = $4`,
      [judul, isi, mulai.iso, id],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal mengubah pengumuman: ${pesan}` };
  }

  if (jumlahDiubah === 0) {
    return { message: "Data pengumuman tidak ditemukan." };
  }

  try {
    await simpanKelas(id, daftarKelasId);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Judul dan isi sudah tersimpan, tapi gagal mengatur kelasnya (${pesan}).`,
    };
  }

  revalidatePath("/guru/pengumuman");
  return { message: null };
}

export async function deletePengumuman(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await requireGuru();

  try {
    await jalankan(`delete from announcements where id = $1`, [id]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menghapus pengumuman:", pesan);
  }

  revalidatePath("/guru/pengumuman");
}
