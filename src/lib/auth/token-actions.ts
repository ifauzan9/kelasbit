"use server";

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { kelas, users } from "@/lib/db/schema";
import type { LoginState } from "@/lib/auth/actions";
import {
  isValidKelasTokenFormat,
  normalizeKelasToken,
} from "@/lib/auth/kelas-token-format";
import { recordLoginLog } from "@/lib/auth/login-log";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  LOGIN_BLOCK_MESSAGE,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { getClientInfo } from "@/lib/auth/request-info";
import { cleanupAuthData, createSession } from "@/lib/auth/session";
import { getMaintenanceSetting } from "@/lib/settings/maintenance";
import { getLoginLocationEnabled } from "@/lib/settings/queries";

export type KelasLookupState = {
  error?: string;
  token?: string;
  kelas?: {
    name: string;
    academicYear: string;
    students: { id: number; name: string }[];
  };
};

const TOKEN_ERROR = "Token kelas tidak ditemukan. Periksa kembali.";
const SERVICE_ERROR = "Layanan sedang tidak tersedia. Coba lagi sebentar.";

function tokenRateLimitKey(token: string): string {
  return `kelas-token:${token}`;
}

/**
 * Langkah 1 login token: validasi token dan ambil daftar siswa aktif di kelas.
 * Daftar nama belum membuat sesi apa pun.
 */
export async function findKelasByToken(
  _prevState: KelasLookupState,
  formData: FormData,
): Promise<KelasLookupState> {
  const token = normalizeKelasToken(String(formData.get("token") ?? ""));

  if (!token) {
    return { error: "Token kelas wajib diisi." };
  }

  const { ip, userAgent } = await getClientInfo();
  const limit = await checkLoginRateLimit(tokenRateLimitKey(token), ip);

  if (limit.blocked) {
    await recordLoginLog({
      identifier: "token kelas",
      role: "siswa",
      status: "diblokir",
      method: "token_kelas",
      reason: "rate_limit",
      ip,
      userAgent,
    });

    return { error: LOGIN_BLOCK_MESSAGE };
  }

  if (!isValidKelasTokenFormat(token)) {
    await recordLoginFailure(tokenRateLimitKey(token), ip);
    await recordLoginLog({
      identifier: "token kelas",
      role: "siswa",
      status: "gagal",
      method: "token_kelas",
      reason: "token_salah",
      ip,
      userAgent,
    });

    return { error: TOKEN_ERROR };
  }

  try {
    const [found] = await getDb()
      .select({
        id: kelas.id,
        name: kelas.name,
        academicYear: kelas.academicYear,
        enabled: kelas.tokenLoginEnabled,
      })
      .from(kelas)
      .where(eq(kelas.loginToken, token))
      .limit(1);

    if (!found) {
      await recordLoginFailure(tokenRateLimitKey(token), ip);
      await recordLoginLog({
        identifier: "token kelas",
        role: "siswa",
        status: "gagal",
        method: "token_kelas",
        reason: "token_salah",
        ip,
        userAgent,
      });

      return { error: TOKEN_ERROR };
    }

    if (!found.enabled) {
      await recordLoginLog({
        identifier: `token kelas (${found.name})`,
        role: "siswa",
        status: "gagal",
        method: "token_kelas",
        reason: "token_nonaktif",
        kelasName: found.name,
        academicYear: found.academicYear,
        ip,
        userAgent,
      });

      return {
        error: `Login token untuk kelas ${found.name} sedang dinonaktifkan oleh guru.`,
      };
    }

    const students = await getDb()
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.kelasId, found.id),
          eq(users.role, "siswa"),
          eq(users.isActive, true),
        ),
      )
      .orderBy(asc(users.name));

    if (students.length === 0) {
      await recordLoginLog({
        identifier: `token kelas (${found.name})`,
        role: "siswa",
        status: "gagal",
        method: "token_kelas",
        reason: "kelas_tanpa_siswa",
        kelasName: found.name,
        academicYear: found.academicYear,
        ip,
        userAgent,
      });

      return { error: "Belum ada siswa aktif di kelas ini." };
    }

    return {
      token,
      kelas: {
        name: found.name,
        academicYear: found.academicYear,
        students,
      },
    };
  } catch (error) {
    console.error("token-login: gagal mencari kelas", error);
    return { error: SERVICE_ERROR };
  }
}

/**
 * Langkah 2 login token: validasi ulang token + siswa, lalu buat sesi.
 * Client tidak dipercaya; daftar nama dari langkah 1 hanya untuk tampilan.
 */
export async function loginWithKelasToken(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const token = normalizeKelasToken(String(formData.get("token") ?? ""));
  const userId = Number(formData.get("userId"));

  if (!token || !Number.isInteger(userId) || userId <= 0) {
    return { error: "Pilih namamu terlebih dahulu." };
  }

  const { ip, userAgent } = await getClientInfo();

  let found:
    | {
        id: number;
        name: string;
        academicYear: string;
        enabled: boolean;
      }
    | undefined;

  try {
    [found] = await getDb()
      .select({
        id: kelas.id,
        name: kelas.name,
        academicYear: kelas.academicYear,
        enabled: kelas.tokenLoginEnabled,
      })
      .from(kelas)
      .where(eq(kelas.loginToken, token))
      .limit(1);
  } catch (error) {
    console.error("token-login: gagal mengambil kelas", error);
    return { error: SERVICE_ERROR };
  }

  if (!found) {
    await recordLoginLog({
      identifier: "token kelas",
      role: "siswa",
      status: "gagal",
      method: "token_kelas",
      reason: "token_salah",
      ip,
      userAgent,
    });

    return { error: TOKEN_ERROR };
  }

  if (!found.enabled) {
    await recordLoginLog({
      identifier: `token kelas (${found.name})`,
      role: "siswa",
      status: "gagal",
      method: "token_kelas",
      reason: "token_nonaktif",
      kelasName: found.name,
      academicYear: found.academicYear,
      ip,
      userAgent,
    });

    return {
      error: `Login token untuk kelas ${found.name} sedang dinonaktifkan oleh guru.`,
    };
  }

  let student:
    | {
        id: number;
        name: string;
        isActive: boolean;
      }
    | undefined;

  try {
    [student] = await getDb()
      .select({ id: users.id, name: users.name, isActive: users.isActive })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.kelasId, found.id),
          eq(users.role, "siswa"),
        ),
      )
      .limit(1);
  } catch (error) {
    console.error("token-login: gagal mengambil siswa", error);
    return { error: SERVICE_ERROR };
  }

  if (!student) {
    await recordLoginLog({
      identifier: `token kelas (${found.name})`,
      role: "siswa",
      status: "gagal",
      method: "token_kelas",
      reason: "siswa_tidak_ada",
      kelasName: found.name,
      academicYear: found.academicYear,
      ip,
      userAgent,
    });

    return { error: "Nama siswa tidak ditemukan di kelas ini." };
  }

  if (!student.isActive) {
    await recordLoginLog({
      userId: student.id,
      userName: student.name,
      identifier: `token kelas (${found.name})`,
      role: "siswa",
      status: "gagal",
      method: "token_kelas",
      reason: "akun_nonaktif",
      kelasName: found.name,
      academicYear: found.academicYear,
      ip,
      userAgent,
    });

    return { error: "Akun ini dinonaktifkan. Hubungi guru." };
  }

  await clearLoginFailures(tokenRateLimitKey(token));
  await cleanupAuthData();

  const maintenance = await getMaintenanceSetting();

  try {
    await createSession(student.id, "siswa", {
      maintenanceAccess: maintenance.enabled,
    });
  } catch (error) {
    console.error("token-login: gagal membuat sesi", error);
    return { error: SERVICE_ERROR };
  }

  const locationEnabled = await getLoginLocationEnabled();

  const loginLogId = await recordLoginLog({
    userId: student.id,
    userName: student.name,
    identifier: `token kelas (${found.name})`,
    role: "siswa",
    status: "berhasil",
    method: "token_kelas",
    kelasName: found.name,
    academicYear: found.academicYear,
    ip,
    userAgent,
    locationStatus: locationEnabled ? "tidak_dicatat" : "dimatikan",
  });

  return {
    success: true,
    stamp: Date.now(),
    redirectTo: "/siswa",
    needsLocation: locationEnabled && loginLogId !== null,
    loginLogId: loginLogId ?? undefined,
  };
}
