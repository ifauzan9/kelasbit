"use server";

import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { LOGIN_LOCATION_KEY } from "@/lib/settings/queries";

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
