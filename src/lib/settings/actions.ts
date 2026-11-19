"use server";

import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { appSettings, sessions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { LOGIN_LOCATION_KEY } from "@/lib/settings/queries";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  DEFAULT_MAINTENANCE_TITLE,
  MAINTENANCE_MESSAGE_KEY,
  MAINTENANCE_MODE_KEY,
  MAINTENANCE_STUDENT_TOKEN_KEY,
  MAINTENANCE_TITLE_KEY,
  MAINTENANCE_TOKEN_KEY,
  MAINTENANCE_UNTIL_KEY,
  MAX_MAINTENANCE_MESSAGE,
  MAX_MAINTENANCE_TITLE,
  getEnvMaintenanceToken,
  getMaintenanceSetting,
  getOrCreateMaintenanceStudentToken,
  getOrCreateMaintenanceToken,
  maintenanceLoginPath,
  maintenanceStudentLoginPath,
  parseJakartaDateTime,
} from "@/lib/settings/maintenance";

export type LoginLocationSettingState = {
  error?: string;
  success?: boolean;
  stamp?: number;
  enabled?: boolean;
};

export async function setLoginLocationEnabled(
  _prevState: LoginLocationSettingState,
  formData: FormData,
): Promise<LoginLocationSettingState> {
  await requireUser("guru");

  const enabled = formData.get("enabled") === "true";
  const value = enabled ? "true" : "false";

  try {
    await getDb()
      .insert(appSettings)
      .values({ key: LOGIN_LOCATION_KEY, value })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("settings: gagal menyimpan pengaturan lokasi login", error);
    return { error: "Gagal menyimpan pengaturan. Coba lagi." };
  }

  return { success: true, stamp: Date.now(), enabled };
}

export type MaintenanceSettingState = {
  error?: string;
  success?: boolean;
  stamp?: number;
  enabled?: boolean;
  loginPath?: string | null;
  studentLoginPath?: string | null;
};

async function upsertSetting(key: string, value: string): Promise<void> {
  await getDb()
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function saveMaintenanceSetting(
  _prevState: MaintenanceSettingState,
  formData: FormData,
): Promise<MaintenanceSettingState> {
  await requireUser("guru");

  const previous = await getMaintenanceSetting();
  const enabled = formData.get("enabled") === "true";
  const title =
    String(formData.get("title") ?? "").trim() || DEFAULT_MAINTENANCE_TITLE;
  const message =
    String(formData.get("message") ?? "").trim() || DEFAULT_MAINTENANCE_MESSAGE;
  const untilRaw = String(formData.get("until") ?? "").trim();

  if (title.length > MAX_MAINTENANCE_TITLE) {
    return {
      error: `Judul maksimal ${MAX_MAINTENANCE_TITLE} karakter.`,
    };
  }

  if (message.length > MAX_MAINTENANCE_MESSAGE) {
    return {
      error: `Pesan maksimal ${MAX_MAINTENANCE_MESSAGE} karakter.`,
    };
  }

  let until: Date | null = null;

  if (untilRaw) {
    until = parseJakartaDateTime(untilRaw);

    if (!until) {
      return { error: "Format waktu buka otomatis tidak valid." };
    }

    if (enabled && until.getTime() <= Date.now()) {
      return {
        error: "Waktu buka otomatis harus setelah waktu sekarang (WIB).",
      };
    }
  }

  // Saat maintenance dimatikan, jadwal otomatis ikut dibersihkan supaya tidak
  // membingungkan saat diaktifkan lagi nanti.
  if (!enabled) until = null;

  try {
    await upsertSetting(MAINTENANCE_MODE_KEY, enabled ? "true" : "false");
    await upsertSetting(MAINTENANCE_TITLE_KEY, title);
    await upsertSetting(MAINTENANCE_MESSAGE_KEY, message);
    await upsertSetting(MAINTENANCE_UNTIL_KEY, until ? until.toISOString() : "");
  } catch (error) {
    console.error("settings: gagal menyimpan pengaturan maintenance", error);
    return { error: "Gagal menyimpan pengaturan. Coba lagi." };
  }

  let loginPath: string | null = null;
  let studentLoginPath: string | null = null;

  // Akses maintenance hanya berlaku untuk sesi yang login ketika mode aktif.
  // Saat mode berubah, bersihkan flag supaya tidak terbawa ke periode berikutnya.
  if (previous.enabled !== enabled) {
    try {
      await getDb().update(sessions).set({ maintenanceAccess: false });
    } catch (error) {
      console.error("settings: gagal mereset akses maintenance sesi", error);
    }
  }

  if (enabled) {
    const tokenInfo = await getOrCreateMaintenanceToken();
    loginPath = maintenanceLoginPath(tokenInfo.token);

    const studentToken = await getOrCreateMaintenanceStudentToken();
    studentLoginPath = maintenanceStudentLoginPath(studentToken);
  }

  return {
    success: true,
    stamp: Date.now(),
    enabled,
    loginPath,
    studentLoginPath,
  };
}

export async function rotateMaintenanceToken(
  _prevState: MaintenanceSettingState,
  formData: FormData,
): Promise<MaintenanceSettingState> {
  await requireUser("guru");

  if (formData.get("intent") !== "rotate") {
    return { error: "Permintaan tidak valid." };
  }

  if (getEnvMaintenanceToken()) {
    return {
      error: "URL login guru sedang dikontrol Environment Variables cPanel.",
    };
  }

  const token = randomBytes(24).toString("base64url");

  try {
    await upsertSetting(MAINTENANCE_TOKEN_KEY, token);
  } catch (error) {
    console.error("settings: gagal mengganti token login guru", error);
    return { error: "Gagal membuat URL baru. Coba lagi." };
  }

  return {
    success: true,
    stamp: Date.now(),
    loginPath: maintenanceLoginPath(token),
  };
}

export async function rotateMaintenanceStudentToken(
  _prevState: MaintenanceSettingState,
  formData: FormData,
): Promise<MaintenanceSettingState> {
  await requireUser("guru");

  if (formData.get("intent") !== "rotate-student") {
    return { error: "Permintaan tidak valid." };
  }

  const token = randomBytes(24).toString("base64url");

  try {
    await upsertSetting(MAINTENANCE_STUDENT_TOKEN_KEY, token);
  } catch (error) {
    console.error("settings: gagal mengganti token login siswa", error);
    return { error: "Gagal membuat URL baru. Coba lagi." };
  }

  return {
    success: true,
    stamp: Date.now(),
    studentLoginPath: maintenanceStudentLoginPath(token),
  };
}
