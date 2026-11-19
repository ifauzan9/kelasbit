import { lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  loginLogs,
  type LoginLogMethod,
  type LoginLogReason,
  type LoginLogStatus,
  type Role,
} from "@/lib/db/schema";
import type { LoginLocationStatus } from "@/lib/auth/geolocation";

const MAX_USER_AGENT_LENGTH = 512;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export type RecordLoginLogInput = {
  userId?: number | null;
  userName?: string | null;
  identifier: string;
  role?: Role;
  status: LoginLogStatus;
  method?: LoginLogMethod;
  reason?: LoginLogReason | null;
  kelasName?: string | null;
  academicYear?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  locationStatus?: LoginLocationStatus | null;
};

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  return value.slice(0, max);
}

/**
 * Catat satu percobaan login siswa. Kegagalan mencatat log tidak boleh
 * menggagalkan proses login, jadi semua error ditelan dan dicatat di console.
 */
export async function recordLoginLog(
  input: RecordLoginLogInput,
): Promise<number | null> {
  // Fitur ini khusus riwayat login siswa.
  if (input.role && input.role !== "siswa") return null;

  try {
    const [row] = await getDb()
      .insert(loginLogs)
      .values({
        userId: input.userId ?? null,
        userName: truncate(input.userName, 120),
        identifier: input.identifier.slice(0, 255),
        role: input.role ?? "siswa",
        status: input.status,
        method: input.method ?? "password",
        reason: input.reason ?? null,
        kelasName: truncate(input.kelasName, 40),
        academicYear: truncate(input.academicYear, 9),
        ip: truncate(input.ip, 45),
        userAgent: truncate(input.userAgent, MAX_USER_AGENT_LENGTH),
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        accuracy: input.accuracy ?? null,
        locationStatus: input.locationStatus ?? "tidak_dicatat",
      })
      .returning({ id: loginLogs.id });

    return row?.id ?? null;
  } catch (error) {
    console.error("login-log: gagal mencatat riwayat login", error);
    return null;
  }
}

/** Hapus riwayat login yang lebih lama dari 90 hari. */
export async function cleanupLoginLogs(): Promise<void> {
  try {
    await getDb()
      .delete(loginLogs)
      .where(lt(loginLogs.createdAt, new Date(Date.now() - RETENTION_MS)));
  } catch (error) {
    console.error("login-log: gagal membersihkan riwayat lama", error);
  }
}
