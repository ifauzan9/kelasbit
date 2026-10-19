"use server";

import { revalidatePath } from "next/cache";
import { requireGuru } from "@/lib/require-guru";
import { hashPassword } from "@/lib/hash-password";
import { banyakBaris, jalankan } from "@/lib/db";

const MAX_USERNAME = 50;
const MIN_PASSWORD = 6;

export type HasilAturKredensial = {
  message: string | null;
  // Pesan sukses terpisah dari error, supaya UI bisa menampilkannya hijau.
  sukses?: boolean;
};

// Guru atur kredensial login siswa (username + password).
// Field: siswa_id, username, password
// Kalau siswa sudah punya akun → update; kalau belum → insert.
export async function aturKredensialSiswa(
  _prevState: HasilAturKredensial,
  formData: FormData,
): Promise<HasilAturKredensial> {
  const siswaId = String(formData.get("siswa_id") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!siswaId) {
    return { message: "Data siswa tidak ditemukan." };
  }

  if (!username) {
    return { message: "Username wajib diisi." };
  }

  if (username.length > MAX_USERNAME) {
    return { message: `Username maksimal ${MAX_USERNAME} karakter.` };
  }

  if (username.length < 3) {
    return { message: "Username minimal 3 karakter." };
  }

  if (password.length < MIN_PASSWORD) {
    return { message: `Password minimal ${MIN_PASSWORD} karakter.` };
  }

  await requireGuru();

  // Cek apakah username sudah dipakai siswa LAIN (bukan siswa ini).
  // Pengecekan harus mengecualikan siswa_id ini, supaya saat guru mengedit
  // username siswa yang sudah punya akun tidak salah dianggap konflik.
  try {
    const pakaiUsername = await banyakBaris<{ id: string }>(
      `select id from student_accounts
       where lower(username) = $1 and siswa_id <> $2
       limit 1`,
      [username, siswaId],
    );

    if (pakaiUsername.length > 0) {
      return { message: "Username sudah dipakai siswa lain." };
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal memeriksa username: ${pesan}` };
  }

  const hash = hashPassword(password);

  try {
    // Satu query untuk update kalau akun sudah ada, insert kalau belum.
    await jalankan(
      `insert into student_accounts (siswa_id, username, password_hash)
       values ($1, $2, $3)
       on conflict (siswa_id)
       do update set username = excluded.username,
                     password_hash = excluded.password_hash`,
      [siswaId, username, hash],
    );
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23505") {
      return { message: "Username sudah dipakai siswa lain." };
    }
    return { message: `Gagal menyimpan kredensial: ${e?.message ?? "tidak diketahui"}` };
  }

  revalidatePath("/guru/siswa");
  return { message: "Username berhasil disimpan.", sukses: true };
}

// Hapus akun login siswa (kalau guru ingin nonaktifkan).
export async function hapusKredensialSiswa(formData: FormData) {
  const siswaId = String(formData.get("siswa_id") ?? "");
  if (!siswaId) return;

  await requireGuru();

  try {
    await jalankan(`delete from student_accounts where siswa_id = $1`, [
      siswaId,
    ]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menghapus kredensial siswa:", pesan);
  }

  revalidatePath("/guru/siswa");
}

// ============================================================================
// Nonaktifkan / aktifkan akun siswa (tanpa menghapus data).
// Field: siswa_id, aktifkan (boolean: true = aktifkan, false = nonaktifkan)
// ============================================================================
export type HasilToggleAkun = { message: string | null };

export async function toggleAkunSiswa(
  _prevState: HasilToggleAkun,
  formData: FormData,
): Promise<HasilToggleAkun> {
  const siswaId = String(formData.get("siswa_id") ?? "");
  if (!siswaId) {
    return { message: "Data siswa tidak ditemukan." };
  }

  const nilaiAktifkan = formData.get("aktifkan") === "true";

  await requireGuru();

  try {
    await jalankan(
      `update student_accounts set is_active = $1 where siswa_id = $2`,
      [nilaiAktifkan, siswaId],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal mengubah status akun: ${pesan}` };
  }

  revalidatePath("/guru/siswa");
  return { message: null };
}
