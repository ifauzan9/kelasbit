"use server";

import { revalidatePath } from "next/cache";
import { jalankan, satuBaris } from "@/lib/db";
import { requireGuru } from "@/lib/require-guru";

export async function addKelas(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const namaKelas = String(formData.get("nama_kelas") ?? "").trim();

  if (!namaKelas) {
    return { message: "Nama kelas wajib diisi." };
  }

  await requireGuru();

  try {
    await jalankan(`insert into classes (nama_kelas) values ($1)`, [namaKelas]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menambah kelas: ${pesan}` };
  }

  revalidatePath("/guru/kelas");
  return { message: null };
}

export async function updateKelas(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const id = String(formData.get("id") ?? "");
  const namaKelas = String(formData.get("nama_kelas") ?? "").trim();

  if (!id) {
    return { message: "Data kelas tidak ditemukan." };
  }

  if (!namaKelas) {
    return { message: "Nama kelas wajib diisi." };
  }

  await requireGuru();

  try {
    const terpengaruh = await jalankan(
      `update classes set nama_kelas = $1 where id = $2`,
      [namaKelas, id],
    );

    if (terpengaruh === 0) {
      return { message: "Kelas tidak ditemukan atau tidak berubah." };
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal mengubah kelas: ${pesan}` };
  }

  revalidatePath("/guru/kelas");
  return { message: null };
}

export async function deleteKelas(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await requireGuru();

  try {
    await jalankan(`delete from classes where id = $1`, [id]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menghapus kelas:", pesan);
  }

  revalidatePath("/guru/kelas");
}

// ============================================================================
// TOKEN LOGIN SISWA PER KELAS
// Guru membuat/mengganti/menghapus token yang dipakai siswa untuk login.
// ============================================================================

const PANJANG_TOKEN_MIN = 4;
const PANJANG_TOKEN_MAX = 32;

// Huruf yang mudah dibedakan saat dibacakan (tanpa 0/O/1/I).
const HURUF_TOKEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function buatTokenAcak(panjang = 6): string {
  let hasil = "";
  for (let i = 0; i < panjang; i += 1) {
    hasil += HURUF_TOKEN[Math.floor(Math.random() * HURUF_TOKEN.length)];
  }
  return hasil;
}

export type HasilTokenKelas = { message: string | null; sukses?: boolean };

// Simpan token untuk sebuah kelas: insert kalau belum ada, update kalau sudah.
async function simpanToken(kelasId: string, token: string) {
  await jalankan(
    `insert into class_tokens (kelas_id, token, diubah_at)
     values ($1, $2, now())
     on conflict (kelas_id)
     do update set token = excluded.token, diubah_at = now()`,
    [kelasId, token],
  );
}

export async function setTokenKelas(
  _prevState: HasilTokenKelas,
  formData: FormData,
): Promise<HasilTokenKelas> {
  const kelasId = String(formData.get("kelas_id") ?? "");
  const token = String(formData.get("token") ?? "").trim().toUpperCase();

  if (!kelasId) {
    return { message: "Data kelas tidak ditemukan." };
  }

  if (!token) {
    return { message: "Token wajib diisi." };
  }

  if (token.length < PANJANG_TOKEN_MIN || token.length > PANJANG_TOKEN_MAX) {
    return {
      message: `Token harus ${PANJANG_TOKEN_MIN}–${PANJANG_TOKEN_MAX} karakter.`,
    };
  }

  if (!/^[A-Z0-9]+$/.test(token)) {
    return { message: "Token hanya boleh huruf dan angka." };
  }

  await requireGuru();

  try {
    await simpanToken(kelasId, token);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menyimpan token: ${pesan}` };
  }

  revalidatePath("/guru/kelas");
  return { message: "Token berhasil disimpan.", sukses: true };
}

// Buat token acak baru untuk kelas (mengganti yang lama).
export async function buatTokenBaru(
  _prevState: HasilTokenKelas,
  formData: FormData,
): Promise<HasilTokenKelas> {
  const kelasId = String(formData.get("kelas_id") ?? "");
  if (!kelasId) {
    return { message: "Data kelas tidak ditemukan." };
  }

  await requireGuru();

  try {
    await simpanToken(kelasId, buatTokenAcak());
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal membuat token: ${pesan}` };
  }

  revalidatePath("/guru/kelas");
  return { message: "Token baru berhasil dibuat.", sukses: true };
}

// Hapus token kelas (menonaktifkan login token untuk kelas itu).
export async function hapusTokenKelas(formData: FormData) {
  const kelasId = String(formData.get("kelas_id") ?? "");
  if (!kelasId) return;

  await requireGuru();

  try {
    await jalankan(`delete from class_tokens where kelas_id = $1`, [kelasId]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menghapus token kelas:", pesan);
  }

  revalidatePath("/guru/kelas");
}

// Dipakai halaman untuk memastikan tabel class_tokens sudah ada.
export async function adaTabelToken(): Promise<boolean> {
  const baris = await satuBaris<{ ada: boolean }>(
    `select to_regclass('public.class_tokens') is not null as ada`,
  );
  return baris?.ada ?? false;
}