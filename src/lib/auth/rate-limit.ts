import { createHash } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";

/** Jendela waktu penghitungan kegagalan login. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Maksimal kegagalan per username/email dalam satu jendela waktu. */
const MAX_FAILURES_PER_IDENTIFIER = 5;

/** Maksimal kegagalan per alamat IP dalam satu jendela waktu. */
const MAX_FAILURES_PER_IP = 30;

/** Catatan percobaan disimpan maksimal sehari, lalu dibersihkan saat login. */
const RETENTION_MS = 24 * 60 * 60 * 1000;

export const LOGIN_BLOCK_MESSAGE =
  "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.";

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export type LoginLimitResult = {
  blocked: boolean;
};

/**
 * Periksa apakah identifier/IP sudah melewati batas kegagalan.
 * Kalau database bermasalah, login dibiarkan lewat (fail-open) agar gangguan
 * kecil tidak mengunci semua pengguna.
 */
export async function checkLoginRateLimit(
  identifier: string,
  ip: string | null,
): Promise<LoginLimitResult> {
  const identifierHash = hashValue(identifier.toLowerCase());
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);

  try {
    const db = getDb();

    const [identifierRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifierHash, identifierHash),
          gt(loginAttempts.createdAt, windowStart),
        ),
      );

    if ((identifierRow?.total ?? 0) >= MAX_FAILURES_PER_IDENTIFIER) {
      return { blocked: true };
    }

    if (ip) {
      const ipHash = hashValue(ip);

      const [ipRow] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(loginAttempts)
        .where(
          and(
            eq(loginAttempts.ipHash, ipHash),
            gt(loginAttempts.createdAt, windowStart),
          ),
        );

      if ((ipRow?.total ?? 0) >= MAX_FAILURES_PER_IP) {
        return { blocked: true };
      }
    }

    return { blocked: false };
  } catch (error) {
    console.error("rate-limit: gagal memeriksa percobaan login", error);
    return { blocked: false };
  }
}

/** Catat satu kegagalan login. Kegagalan mencatat tidak boleh menggagalkan login. */
export async function recordLoginFailure(
  identifier: string,
  ip: string | null,
): Promise<void> {
  try {
    await getDb()
      .insert(loginAttempts)
      .values({
        identifierHash: hashValue(identifier.toLowerCase()),
        ipHash: ip ? hashValue(ip) : null,
      });
  } catch (error) {
    console.error("rate-limit: gagal mencatat percobaan login", error);
  }
}

/** Hapus catatan gagal untuk identifier setelah login berhasil. */
export async function clearLoginFailures(identifier: string): Promise<void> {
  try {
    await getDb()
      .delete(loginAttempts)
      .where(
        eq(loginAttempts.identifierHash, hashValue(identifier.toLowerCase())),
      );
  } catch (error) {
    console.error("rate-limit: gagal membersihkan percobaan login", error);
  }
}

/** Bersihkan catatan percobaan lama (dipanggil saat login berhasil). */
export async function cleanupLoginAttempts(): Promise<void> {
  try {
    await getDb()
      .delete(loginAttempts)
      .where(lt(loginAttempts.createdAt, new Date(Date.now() - RETENTION_MS)));
  } catch (error) {
    console.error("rate-limit: gagal membersihkan catatan lama", error);
  }
}
