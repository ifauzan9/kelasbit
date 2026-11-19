import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loginLogs } from "@/lib/db/schema";
import {
  normalizeLoginLocation,
  type LoginLocation,
} from "@/lib/auth/geolocation";
import { getLoginLocationEnabled } from "@/lib/settings/queries";

/** Batas waktu update log setelah login berhasil. */
const MAX_AGE_MS = 2 * 60 * 1000;

/**
 * Simpan lokasi ke baris log login milik user. Hanya log `berhasil` yang baru
 * dibuat yang boleh diubah.
 */
export async function saveLoginLocationForUser(
  userId: number,
  logId: number,
  location: LoginLocation,
): Promise<void> {
  if (!Number.isInteger(logId) || logId <= 0) return;
  if (!location || typeof location !== "object") return;

  try {
    const db = getDb();

    const [row] = await db
      .select({
        id: loginLogs.id,
        userId: loginLogs.userId,
        status: loginLogs.status,
        createdAt: loginLogs.createdAt,
      })
      .from(loginLogs)
      .where(and(eq(loginLogs.id, logId), eq(loginLogs.userId, userId)))
      .limit(1);

    if (!row || row.status !== "berhasil") return;
    if (Date.now() - row.createdAt.getTime() > MAX_AGE_MS) return;

    const enabled = await getLoginLocationEnabled();

    if (!enabled) {
      await db
        .update(loginLogs)
        .set({
          latitude: null,
          longitude: null,
          accuracy: null,
          locationStatus: "dimatikan",
        })
        .where(eq(loginLogs.id, logId));

      return;
    }

    const normalized = normalizeLoginLocation(location);

    await db
      .update(loginLogs)
      .set({
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        accuracy: normalized.accuracy,
        locationStatus: normalized.status,
      })
      .where(eq(loginLogs.id, logId));
  } catch (error) {
    console.error("login-location: gagal menyimpan lokasi login", error);
  }
}
