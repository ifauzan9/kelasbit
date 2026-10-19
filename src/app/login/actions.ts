"use server";

import { redirect } from "next/navigation";
import { satuBaris } from "@/lib/db";
import { verifikasiPassword } from "@/lib/hash-password";
import { simpanSesiGuru } from "@/lib/guru-sesi";
import {
  ambilIp,
  catatGagal,
  cekBlokir,
  pesanTerlaluBanyak,
  resetGagal,
} from "@/lib/rate-limit";

// Login guru memakai username + password yang disimpan di tabel
// guru_accounts. Password di-hash PBKDF2 dan diverifikasi di server
// (bukan lagi Supabase Auth).
export async function login(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { message: "Username dan password wajib diisi." };
  }

  // Pembatasan percobaan login (anti brute force / spam).
  const kunci = `guru:${await ambilIp()}:${username}`;
  const cek = cekBlokir(kunci);
  if (!cek.boleh) {
    return { message: pesanTerlaluBanyak(cek.sisaDetik) };
  }

  try {
    const akun = await satuBaris<{
      username: string;
      password_hash: string;
      is_active: boolean;
    }>(
      `select username, password_hash, is_active
       from guru_accounts
       where lower(username) = lower($1)`,
      [username],
    );

    // Pesan disamarkan agar tidak membocorkan apakah username terdaftar.
    if (!akun || akun.is_active === false) {
      catatGagal(kunci);
      return { message: "Username atau password salah." };
    }

    if (!verifikasiPassword(password, akun.password_hash)) {
      catatGagal(kunci);
      return { message: "Username atau password salah." };
    }
  } catch {
    return {
      message:
        "Tidak bisa terhubung ke database. Periksa DATABASE_URL di .env.local.",
    };
  }

  resetGagal(kunci);
  await simpanSesiGuru({ username: username });
  redirect("/guru");
}