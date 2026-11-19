import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

export const LOGIN_LOCATION_KEY = "login_location_enabled";

export type LoginLocationSetting = {
  enabled: boolean;
  updatedAt: Date | null;
};

/**
 * Baca toggle lacak lokasi login siswa. Default nonaktif kalau baris belum ada
 * atau database sedang bermasalah.
 */
export async function getLoginLocationSetting(): Promise<LoginLocationSetting> {
  try {
    const [row] = await getDb()
      .select({ value: appSettings.value, updatedAt: appSettings.updatedAt })
      .from(appSettings)
      .where(eq(appSettings.key, LOGIN_LOCATION_KEY))
      .limit(1);

    return {
      enabled: row?.value === "true",
      updatedAt: row?.updatedAt ?? null,
    };
  } catch (error) {
    console.error("settings: gagal membaca pengaturan lokasi login", error);
    return { enabled: false, updatedAt: null };
  }
}

export async function getLoginLocationEnabled(): Promise<boolean> {
  const setting = await getLoginLocationSetting();
  return setting.enabled;
}
