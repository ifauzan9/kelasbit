import { cache } from "react";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

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
} from "@/lib/settings/maintenance-constants";

export {
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
} from "@/lib/settings/maintenance-constants";

const SETTING_KEYS = [
  MAINTENANCE_MODE_KEY,
  MAINTENANCE_TITLE_KEY,
  MAINTENANCE_MESSAGE_KEY,
  MAINTENANCE_UNTIL_KEY,
  MAINTENANCE_TOKEN_KEY,
];

/** Token dari cPanel di bawah panjang ini dianggap tidak aman dan diabaikan. */
const MIN_ENV_TOKEN_LENGTH = 16;

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export type MaintenanceSetting = {
  enabled: boolean;
  title: string;
  message: string;
  until: Date | null;
  updatedAt: Date | null;
  /** Jadwal buka otomatis sudah lewat (mode maintenance nonaktif karena waktu). */
  expired: boolean;
  /** Nilai dari Environment Variables cPanel menimpa nilai di database. */
  envControlled: boolean;
};

export type MaintenanceTokenSource = "db" | "env";

type SettingRow = {
  key: string;
  value: string;
  updatedAt: Date;
};

function readEnvMode(): boolean | null {
  const raw = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  if (!raw) return null;

  if (["1", "true", "on", "ya"].includes(raw)) return true;
  if (["0", "false", "off", "tidak"].includes(raw)) return false;

  console.warn(
    `maintenance: nilai MAINTENANCE_MODE "${raw}" tidak dikenali, diabaikan.`,
  );
  return null;
}

export function getEnvMaintenanceToken(): string | null {
  const raw = process.env.MAINTENANCE_GURU_TOKEN?.trim();
  if (!raw) return null;

  if (raw.length < MIN_ENV_TOKEN_LENGTH) {
    console.warn(
      `maintenance: MAINTENANCE_GURU_TOKEN minimal ${MIN_ENV_TOKEN_LENGTH} karakter, diabaikan.`,
    );
    return null;
  }

  return raw;
}

function parseStoredDate(value: string | undefined | null): Date | null {
  const raw = value?.trim();
  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Ubah nilai `datetime-local` (WIB) menjadi Date UTC. */
export function parseJakartaDateTime(value: string): Date | null {
  const raw = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    raw,
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second ?? "00"}+07:00`,
  );
  if (Number.isNaN(date.getTime())) return null;

  // Tolak tanggal yang "dibetulkan" otomatis oleh Date (mis. 31 Februari).
  const parts = jakartaParts(date);
  const actual = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  const expected = `${year}-${month}-${day}T${hour}:${minute}`;

  return actual === expected ? date : null;
}

/** Nilai untuk `<input type="datetime-local">` dalam zona WIB. */
export function toJakartaDateTimeInput(date: Date): string {
  const parts = jakartaParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatJakartaDateTime(date: Date): string {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${formatted} WIB`;
}

function jakartaParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
  };
}

async function readRows(): Promise<Map<string, SettingRow>> {
  const rows = await getDb()
    .select({
      key: appSettings.key,
      value: appSettings.value,
      updatedAt: appSettings.updatedAt,
    })
    .from(appSettings)
    .where(inArray(appSettings.key, SETTING_KEYS));

  return new Map(rows.map((row) => [row.key, row]));
}

/**
 * Baca pengaturan maintenance. Nilai env cPanel mengalahkan database.
 * Fail-open: kalau database error (dan env tidak memaksa), anggap nonaktif.
 */
export const getMaintenanceSetting = cache(
  async (): Promise<MaintenanceSetting> => {
    const envMode = readEnvMode();
    const envEnabled = envMode === true;
    const envTitle = process.env.MAINTENANCE_TITLE?.trim();
    const envMessage = process.env.MAINTENANCE_MESSAGE?.trim();

    let rows = new Map<string, SettingRow>();

    try {
      rows = await readRows();
    } catch (error) {
      console.error("maintenance: gagal membaca pengaturan maintenance", error);
    }

    const modeRow = rows.get(MAINTENANCE_MODE_KEY);
    const storedEnabled = modeRow?.value === "true" || modeRow?.value === "1";
    const until = parseStoredDate(rows.get(MAINTENANCE_UNTIL_KEY)?.value);
    const envControlled = envMode !== null;
    const expired =
      !envControlled &&
      storedEnabled &&
      until !== null &&
      until.getTime() <= Date.now();
    const enabled = envControlled ? envMode : storedEnabled && !expired;

    const storedTitle = rows.get(MAINTENANCE_TITLE_KEY)?.value?.trim();
    const storedMessage = rows.get(MAINTENANCE_MESSAGE_KEY)?.value?.trim();

    return {
      enabled,
      title: (
        envEnabled && envTitle ? envTitle : storedTitle || DEFAULT_MAINTENANCE_TITLE
      ).slice(0, MAX_MAINTENANCE_TITLE),
      message: (
        envEnabled && envMessage
          ? envMessage
          : storedMessage || DEFAULT_MAINTENANCE_MESSAGE
      ).slice(0, MAX_MAINTENANCE_MESSAGE),
      until,
      updatedAt: modeRow?.updatedAt ?? null,
      expired,
      envControlled,
    };
  },
);

export async function getMaintenanceToken(): Promise<string | null> {
  try {
    const [row] = await getDb()
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, MAINTENANCE_TOKEN_KEY))
      .limit(1);

    return row?.value?.trim() || null;
  } catch (error) {
    console.error("maintenance: gagal membaca token login guru", error);
    return null;
  }
}

export async function getMaintenanceStudentToken(): Promise<string | null> {
  try {
    const [row] = await getDb()
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, MAINTENANCE_STUDENT_TOKEN_KEY))
      .limit(1);

    return row?.value?.trim() || null;
  } catch (error) {
    console.error("maintenance: gagal membaca token login siswa", error);
    return null;
  }
}

export async function getEffectiveMaintenanceToken(): Promise<{
  token: string | null;
  source: MaintenanceTokenSource | null;
}> {
  const envToken = getEnvMaintenanceToken();
  if (envToken) return { token: envToken, source: "env" };

  const token = await getMaintenanceToken();
  return token ? { token, source: "db" } : { token: null, source: null };
}

/**
 * Token untuk URL login guru saat maintenance. Dibuat sekali kalau belum ada.
 * Penulisan onConflictDoNothing membuat panggilan berulang (prefetch/refresh) aman.
 */
export async function getOrCreateMaintenanceToken(): Promise<{
  token: string;
  source: MaintenanceTokenSource;
}> {
  const envToken = getEnvMaintenanceToken();
  if (envToken) return { token: envToken, source: "env" };

  const existing = await getMaintenanceToken();
  if (existing) return { token: existing, source: "db" };

  const token = randomBytes(24).toString("base64url");

  try {
    await getDb()
      .insert(appSettings)
      .values({ key: MAINTENANCE_TOKEN_KEY, value: token })
      .onConflictDoNothing();
  } catch (error) {
    console.error("maintenance: gagal membuat token login guru", error);
    return { token, source: "db" };
  }

  const stored = await getMaintenanceToken();
  return { token: stored ?? token, source: "db" };
}

export function maintenanceLoginPath(token: string): string {
  return `/guru-masuk/${token}`;
}

/** Token URL login siswa saat maintenance (selalu dari database). */
export async function getOrCreateMaintenanceStudentToken(): Promise<string> {
  const existing = await getMaintenanceStudentToken();
  if (existing) return existing;

  const token = randomBytes(24).toString("base64url");

  try {
    await getDb()
      .insert(appSettings)
      .values({ key: MAINTENANCE_STUDENT_TOKEN_KEY, value: token })
      .onConflictDoNothing();
  } catch (error) {
    console.error("maintenance: gagal membuat token login siswa", error);
    return token;
  }

  const stored = await getMaintenanceStudentToken();
  return stored ?? token;
}

export function maintenanceStudentLoginPath(token: string): string {
  return `/siswa-masuk/${token}`;
}

export function isValidMaintenanceToken(
  input: string,
  expected: string | null,
): boolean {
  if (!input || !expected) return false;

  const given = Buffer.from(input);
  const target = Buffer.from(expected);

  if (given.length !== target.length) return false;

  return timingSafeEqual(given, target);
}
