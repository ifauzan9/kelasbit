"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { kelas, users, type Role } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { recordLoginLog } from "@/lib/auth/login-log";
import { getLoginLocationEnabled } from "@/lib/settings/queries";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  LOGIN_BLOCK_MESSAGE,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { getClientInfo } from "@/lib/auth/request-info";
import { getMaintenanceSetting } from "@/lib/settings/maintenance";
import {
  cleanupAuthData,
  createSession,
  destroySession,
  homePathForRole,
} from "@/lib/auth/session";

export type LoginState = {
  error?: string;
  success?: boolean;
  stamp?: number;
  redirectTo?: string;
  needsLocation?: boolean;
  loginLogId?: number;
};

function parseRole(value: FormDataEntryValue | null): Role | null {
  return value === "siswa" || value === "guru" ? value : null;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const role = parseRole(formData.get("role"));
  const identifier = String(formData.get("identifier") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!role) {
    return { error: "Halaman login tidak valid." };
  }

  const identifierLabel = role === "guru" ? "Email" : "Username";

  if (!identifier || !password) {
    return { error: `${identifierLabel} dan password wajib diisi.` };
  }

  const { ip, userAgent } = await getClientInfo();
  const limit = await checkLoginRateLimit(identifier, ip);

  if (limit.blocked) {
    await recordLoginLog({
      identifier,
      userName: identifier,
      role,
      status: "diblokir",
      reason: "rate_limit",
      ip,
      userAgent,
    });

    return { error: LOGIN_BLOCK_MESSAGE };
  }

  let found:
    | {
        user: typeof users.$inferSelect;
        kelasName: string | null;
        academicYear: string | null;
      }
    | undefined;

  try {
    [found] = await getDb()
      .select({
        user: users,
        kelasName: kelas.name,
        academicYear: kelas.academicYear,
      })
      .from(users)
      .leftJoin(kelas, eq(kelas.id, users.kelasId))
      .where(role === "guru" ? eq(users.email, identifier) : eq(users.username, identifier))
      .limit(1);
  } catch (error) {
    console.error("login: gagal mengambil data user", error);
    return { error: "Layanan sedang tidak tersedia. Coba lagi sebentar." };
  }

  const user = found?.user;
  const kelasName = found?.kelasName ?? null;
  const academicYear = found?.academicYear ?? null;

  if (!user) {
    await recordLoginFailure(identifier, ip);
    await recordLoginLog({
      identifier,
      userName: identifier,
      role,
      status: "gagal",
      reason: "akun_tidak_ditemukan",
      ip,
      userAgent,
    });

    return { error: `${identifierLabel} atau password salah.` };
  }

  if (user.role !== role) {
    await recordLoginFailure(identifier, ip);
    await recordLoginLog({
      identifier,
      userName: identifier,
      role,
      status: "gagal",
      reason: "bukan_akun_siswa",
      ip,
      userAgent,
    });

    return { error: `${identifierLabel} atau password salah.` };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    await recordLoginFailure(identifier, ip);
    await recordLoginLog({
      userId: user.id,
      userName: user.name,
      identifier,
      role,
      status: "gagal",
      reason: "password_salah",
      kelasName,
      academicYear,
      ip,
      userAgent,
    });

    return { error: `${identifierLabel} atau password salah.` };
  }

  if (!user.isActive) {
    await recordLoginFailure(identifier, ip);
    await recordLoginLog({
      userId: user.id,
      userName: user.name,
      identifier,
      role,
      status: "gagal",
      reason: "akun_nonaktif",
      kelasName,
      academicYear,
      ip,
      userAgent,
    });

    return { error: "Akun ini dinonaktifkan. Hubungi guru." };
  }

  await clearLoginFailures(identifier);
  await cleanupAuthData();

  const maintenance =
    role === "siswa" ? await getMaintenanceSetting() : null;

  try {
    await createSession(user.id, role, {
      maintenanceAccess: role === "siswa" && Boolean(maintenance?.enabled),
    });
  } catch (error) {
    console.error("login: gagal membuat sesi", error);
    return { error: "Layanan sedang tidak tersedia. Coba lagi sebentar." };
  }

  const locationEnabled =
    role === "siswa" ? await getLoginLocationEnabled() : false;

  const loginLogId = await recordLoginLog({
    userId: user.id,
    userName: user.name,
    identifier,
    role,
    status: "berhasil",
    kelasName,
    academicYear,
    ip,
    userAgent,
    locationStatus: locationEnabled ? "tidak_dicatat" : "dimatikan",
  });

  return {
    success: true,
    stamp: Date.now(),
    redirectTo: homePathForRole(role),
    needsLocation: role === "siswa" && locationEnabled && loginLogId !== null,
    loginLogId: loginLogId ?? undefined,
  };
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
