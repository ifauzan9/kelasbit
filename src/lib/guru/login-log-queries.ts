import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loginLogs, type LoginLogStatus } from "@/lib/db/schema";

export const LOG_PAGE_SIZE = 25;

export type LoginLogStatusFilter = "semua" | LoginLogStatus;

export type LoginLogFilter = {
  status: LoginLogStatusFilter;
  search: string;
  /** "semua" | "tanpa" | "Nama Kelas|Tahun Ajaran" */
  kelas: string;
  /** null berarti semua waktu */
  days: number | null;
  page: number;
};

export type LoginLogRow = {
  id: number;
  userId: number | null;
  userName: string | null;
  identifier: string;
  status: LoginLogStatus;
  method: string;
  reason: string | null;
  kelasName: string | null;
  academicYear: string | null;
  ip: string | null;
  userAgent: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationStatus: string;
  createdAt: Date;
};

export type LoginLogResult = {
  rows: LoginLogRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

function buildConditions(filter: LoginLogFilter) {
  const conditions = [eq(loginLogs.role, "siswa")];

  if (filter.status !== "semua") {
    conditions.push(eq(loginLogs.status, filter.status));
  }

  if (filter.search) {
    const needle = `%${filter.search}%`;
    const searchCondition = or(
      ilike(loginLogs.userName, needle),
      ilike(loginLogs.identifier, needle),
    );

    if (searchCondition) conditions.push(searchCondition);
  }

  if (filter.kelas === "tanpa") {
    conditions.push(isNull(loginLogs.kelasName));
  } else if (filter.kelas !== "semua") {
    const separator = filter.kelas.indexOf("|");
    const name = separator === -1 ? filter.kelas : filter.kelas.slice(0, separator);
    const year = separator === -1 ? "" : filter.kelas.slice(separator + 1);

    if (name) conditions.push(eq(loginLogs.kelasName, name));
    if (year) conditions.push(eq(loginLogs.academicYear, year));
  }

  if (filter.days) {
    conditions.push(
      gte(
        loginLogs.createdAt,
        new Date(Date.now() - filter.days * 24 * 60 * 60 * 1000),
      ),
    );
  }

  return and(...conditions);
}

function toStatus(value: string): LoginLogStatus {
  if (value === "gagal" || value === "diblokir") return value;
  return "berhasil";
}

export async function listLoginLogs(filter: LoginLogFilter): Promise<LoginLogResult> {
  const db = getDb();
  const where = buildConditions(filter);

  const [totalRow] = await db
    .select({ total: count() })
    .from(loginLogs)
    .where(where);

  const total = totalRow?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));
  const page = Math.min(Math.max(1, filter.page), pageCount);

  const rows = await db
    .select({
      id: loginLogs.id,
      userId: loginLogs.userId,
      userName: loginLogs.userName,
      identifier: loginLogs.identifier,
      status: loginLogs.status,
      method: loginLogs.method,
      reason: loginLogs.reason,
      kelasName: loginLogs.kelasName,
      academicYear: loginLogs.academicYear,
      ip: loginLogs.ip,
      userAgent: loginLogs.userAgent,
      latitude: loginLogs.latitude,
      longitude: loginLogs.longitude,
      accuracy: loginLogs.accuracy,
      locationStatus: loginLogs.locationStatus,
      createdAt: loginLogs.createdAt,
    })
    .from(loginLogs)
    .where(where)
    .orderBy(desc(loginLogs.createdAt))
    .limit(LOG_PAGE_SIZE)
    .offset((page - 1) * LOG_PAGE_SIZE);

  return {
    rows: rows.map((row) => ({ ...row, status: toStatus(row.status) })),
    total,
    page,
    pageCount,
    pageSize: LOG_PAGE_SIZE,
  };
}

export async function listLoginLogKelasOptions() {
  return getDb()
    .selectDistinct({
      kelasName: loginLogs.kelasName,
      academicYear: loginLogs.academicYear,
    })
    .from(loginLogs)
    .where(and(eq(loginLogs.role, "siswa"), isNotNull(loginLogs.kelasName)))
    .orderBy(asc(loginLogs.kelasName), asc(loginLogs.academicYear));
}

/** Awal hari ini menurut zona waktu Asia/Jakarta (WIB). */
function startOfTodayWib(): Date {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const startWibAsUtc = Date.UTC(
    wib.getUTCFullYear(),
    wib.getUTCMonth(),
    wib.getUTCDate(),
  );

  return new Date(startWibAsUtc - 7 * 60 * 60 * 1000);
}

export type LoginLogStats = {
  todaySuccess: number;
  todayFailed: number;
  todayBlocked: number;
  uniqueStudents7d: number;
};

export async function getLoginLogStats(): Promise<LoginLogStats> {
  const todayStart = startOfTodayWib();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [row] = await getDb()
    .select({
      todaySuccess: sql<number>`(count(*) filter (where ${loginLogs.createdAt} >= ${todayStart} and ${loginLogs.status} = 'berhasil'))::int`,
      todayFailed: sql<number>`(count(*) filter (where ${loginLogs.createdAt} >= ${todayStart} and ${loginLogs.status} = 'gagal'))::int`,
      todayBlocked: sql<number>`(count(*) filter (where ${loginLogs.createdAt} >= ${todayStart} and ${loginLogs.status} = 'diblokir'))::int`,
      uniqueStudents7d: sql<number>`(count(distinct ${loginLogs.userId}) filter (where ${loginLogs.createdAt} >= ${weekStart} and ${loginLogs.status} = 'berhasil'))::int`,
    })
    .from(loginLogs)
    .where(eq(loginLogs.role, "siswa"));

  return {
    todaySuccess: row?.todaySuccess ?? 0,
    todayFailed: row?.todayFailed ?? 0,
    todayBlocked: row?.todayBlocked ?? 0,
    uniqueStudents7d: row?.uniqueStudents7d ?? 0,
  };
}
