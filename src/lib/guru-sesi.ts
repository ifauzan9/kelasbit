import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { satuBaris } from "@/lib/db";

// ============================================================================
// Sesi login guru (kustom, pengganti Supabase Auth).
//
// Mekanisme sama dengan sesi siswa:
//  - Cookie "guru_session": "<payload-base64url>.<hmac>"
//    payload = "<uuid>|<username>|<iat_ms>"
//  - requireGuru() baca cookie → cek HMAC + umur token → pastikan akun
//    masih ada & aktif di tabel guru_accounts.
// ============================================================================

export const NAMA_COOKIE_GURU = "guru_session";
const UMUR_SESI_MS = 1000 * 60 * 60 * 12; // 12 jam

function ambilSecret(): string {
  const secret = process.env.GURU_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("GURU_SESSION_SECRET wajib berisi minimal 32 karakter.");
  }
  return secret;
}

function tandaHmac(payload: string): string {
  return createHmac("sha256", ambilSecret()).update(payload).digest("hex");
}

export type SesiGuru = {
  username: string;
};

export function buatTokenSesiGuru(sesi: SesiGuru): string {
  const payload = `${randomUUID()}|${sesi.username}|${Date.now()}`;
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  return `${b64}.${tandaHmac(payload)}`;
}

export function bacaTokenSesiGuru(token: string | undefined): SesiGuru | null {
  if (!token || !token.includes(".")) return null;
  const titik = token.lastIndexOf(".");
  const b64 = token.slice(0, titik);
  const hmacSimpan = token.slice(titik + 1);
  if (!b64 || !hmacSimpan) return null;

  const payload = Buffer.from(b64, "base64url").toString("utf8");
  if (!payload) return null;

  const hmacSeharusnya = tandaHmac(payload);
  if (hmacSeharusnya.length !== hmacSimpan.length) return null;
  if (!timingSafeEqual(Buffer.from(hmacSimpan), Buffer.from(hmacSeharusnya))) {
    return null;
  }

  const bagian = payload.split("|");
  if (bagian.length < 3) return null;
  const username = bagian.slice(1, -1).join("|");
  const iat = Number(bagian[bagian.length - 1]);
  if (!username || !Number.isFinite(iat)) return null;

  const umur = Date.now() - iat;
  if (umur < 0 || umur > UMUR_SESI_MS) return null;

  return { username };
}

export async function simpanSesiGuru(sesi: SesiGuru) {
  const store = await cookies();
  store.set(NAMA_COOKIE_GURU, buatTokenSesiGuru(sesi), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(UMUR_SESI_MS / 1000),
    secure: process.env.NODE_ENV === "production",
  });
}

export async function hapusSesiGuru() {
  const store = await cookies();
  store.delete(NAMA_COOKIE_GURU);
}

export async function ambilSesiGuru(): Promise<SesiGuru | null> {
  const store = await cookies();
  return bacaTokenSesiGuru(store.get(NAMA_COOKIE_GURU)?.value);
}

// Guard untuk semua halaman guru: sesi valid + akun masih aktif.
export async function requireGuru(): Promise<SesiGuru> {
  const sesi = await ambilSesiGuru();
  if (!sesi) redirect("/login");

  const akun = await satuBaris<{ is_active: boolean }>(
    `select is_active from guru_accounts where lower(username) = lower($1)`,
    [sesi.username],
  );

  if (!akun || akun.is_active === false) {
    redirect("/login");
  }

  return sesi;
}

// Versi non-redirect, untuk route handler (mis. unduh file) yang perlu
// membalas sendiri, bukan melempar redirect.
export async function guruSudahLogin(): Promise<boolean> {
  const sesi = await ambilSesiGuru();
  if (!sesi) return false;

  const akun = await satuBaris<{ is_active: boolean }>(
    `select is_active from guru_accounts where lower(username) = lower($1)`,
    [sesi.username],
  );

  return Boolean(akun && akun.is_active !== false);
}
