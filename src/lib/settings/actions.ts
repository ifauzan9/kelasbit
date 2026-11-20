"use server";

import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings, sessions, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { LOGIN_LOCATION_KEY, TOKEN_LOGIN_KEY } from "@/lib/settings/queries";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  DEFAULT_MAINTENANCE_TITLE,
  MAINTENANCE_MESSAGE_KEY,
  MAINTENANCE_MODE_KEY,
  MAINTENANCE_OVERRIDE_START_KEY,
  MAINTENANCE_OVERRIDE_VALUE_KEY,
  MAINTENANCE_START_KEY,
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

export type GlobalTokenLoginState = {
  error?: string;
  success?: boolean;
  stamp?: number;
  enabled?: boolean;
};

/**
 * Saklar global login token kelas. Saat nonaktif, tab/method token ditolak
 * untuk semua kelas tanpa mengubah token per kelas.
 */
export async function setGlobalTokenLoginEnabled(
  _prevState: GlobalTokenLoginState,
  formData: FormData,
): Promise<GlobalTokenLoginState> {
  await requireUser("guru");

  const enabled = formData.get("enabled") === "true";
  const value = enabled ? "true" : "false";

  try {
    await getDb()
      .insert(appSettings)
      .values({ key: TOKEN_LOGIN_KEY, value })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("settings: gagal menyimpan pengaturan login token", error);
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
  const startRaw = String(formData.get("start") ?? "").trim();
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

  let start: Date | null = null;
  let until: Date | null = null;

  if (startRaw || untilRaw) {
    if (startRaw) {
      start = parseJakartaDateTime(startRaw);
      if (!start) return { error: "Format waktu mulai tidak valid." };
    }

    if (untilRaw) {
      until = parseJakartaDateTime(untilRaw);
      if (!until) return { error: "Format waktu selesai tidak valid." };
    }

    // Waktu selesai boleh kosong (maintenance berjalan sampai dimatikan
    // manual). Tanpa waktu mulai, hanya data lama until-only yang diizinkan.
    if (
      !startRaw &&
      !(previous.start === null && previous.until !== null)
    ) {
      return {
        error: "Isi waktu mulai, atau kosongkan kedua waktu.",
      };
    }

    if (start && until && start.getTime() >= until.getTime()) {
      return {
        error: "Waktu mulai harus lebih awal dari waktu selesai.",
      };
    }
  }

  const now = Date.now();
  const startMs = start ? start.getTime() : null;
  const untilMs = until ? until.getTime() : null;
  const previousStartMs = previous.start ? previous.start.getTime() : null;
  const previousUntilMs = previous.until ? previous.until.getTime() : null;

  // Bandingkan per menit: input `datetime-local` tidak menyimpan detik.
  const sameMinute = (a: number | null, b: number | null) =>
    a === null || b === null
      ? a === b
      : Math.floor(a / 60_000) === Math.floor(b / 60_000);
  const scheduleChanged =
    !sameMinute(startMs, previousStartMs) ||
    !sameMinute(untilMs, previousUntilMs);

  // Jadwal lama yang sudah selesai boleh disimpan apa adanya (mis. saat guru
  // menyalakan maintenance manual lagi); jadwal baru tetap harus berakhir di
  // masa depan.
  if (scheduleChanged && until !== null && until.getTime() <= now) {
    return {
      error: "Waktu selesai harus setelah waktu sekarang (WIB).",
    };
  }

  const windowActive =
    (startMs !== null && untilMs === null && now >= startMs) ||
    (startMs !== null &&
      untilMs !== null &&
      now >= startMs &&
      now < untilMs);

  // Switch form mengirim status efektif yang diinginkan; itulah status yang
  // terlihat setelah disimpan (baik sebagai mode manual maupun override jadwal).
  const nextEnabled = enabled;

  try {
    await upsertSetting(MAINTENANCE_TITLE_KEY, title);
    await upsertSetting(MAINTENANCE_MESSAGE_KEY, message);
    await upsertSetting(
      MAINTENANCE_START_KEY,
      start ? start.toISOString() : "",
    );
    await upsertSetting(
      MAINTENANCE_UNTIL_KEY,
      until ? until.toISOString() : "",
    );

    if (windowActive) {
      // Jangan menyentuh mode manual; simpan override untuk jendela ini saja.
      if (scheduleChanged || enabled !== previous.enabled) {
        await upsertSetting(
          MAINTENANCE_OVERRIDE_VALUE_KEY,
          enabled ? "on" : "off",
        );
        await upsertSetting(
          MAINTENANCE_OVERRIDE_START_KEY,
          start ? start.toISOString() : "",
        );
      }
    } else {
      await upsertSetting(MAINTENANCE_MODE_KEY, enabled ? "true" : "false");

      // Jadwal berubah/dihapus: override lama tidak boleh terbawa.
      if (scheduleChanged) {
        await upsertSetting(MAINTENANCE_OVERRIDE_VALUE_KEY, "");
        await upsertSetting(MAINTENANCE_OVERRIDE_START_KEY, "");
      }
    }
  } catch (error) {
    console.error("settings: gagal menyimpan pengaturan maintenance", error);
    return { error: "Gagal menyimpan pengaturan. Coba lagi." };
  }

  let loginPath: string | null = null;
  let studentLoginPath: string | null = null;

  // Saat maintenance dinyalakan manual, putus semua sesi siswa yang sedang
  // login. Untuk jadwal otomatis, guard di `getCurrentUser()` yang memutus
  // sesi per siswa saat request berikutnya (sesi login maintenance tetap aman).
  if (!previous.enabled && nextEnabled && !windowActive) {
    try {
      await getDb()
        .delete(sessions)
        .where(
          inArray(
            sessions.userId,
            getDb()
              .select({ id: users.id })
              .from(users)
              .where(eq(users.role, "siswa")),
          ),
        );
    } catch (error) {
      console.error("settings: gagal menghapus sesi siswa saat maintenance", error);
    }
  }

  // Akses maintenance hanya berlaku untuk sesi yang login ketika mode aktif.
  // Saat mode/jadwal berubah, bersihkan flag supaya tidak terbawa ke periode
  // berikutnya.
  if (previous.enabled !== nextEnabled || scheduleChanged) {
    try {
      await getDb().update(sessions).set({ maintenanceAccess: false });
    } catch (error) {
      console.error("settings: gagal mereset akses maintenance sesi", error);
    }
  }

  if (nextEnabled) {
    const tokenInfo = await getOrCreateMaintenanceToken();
    loginPath = maintenanceLoginPath(tokenInfo.token);

    const studentToken = await getOrCreateMaintenanceStudentToken();
    studentLoginPath = maintenanceStudentLoginPath(studentToken);
  }

  return {
    success: true,
    stamp: Date.now(),
    enabled: nextEnabled,
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
