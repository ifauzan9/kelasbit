"use server";

import { and, eq, ne } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { kelas, sessions, users } from "@/lib/db/schema";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import {
  detectSpreadsheetFormat,
  readXlsx,
  type SpreadsheetRow,
} from "@/lib/guru/siswa-excel";
import {
  isValidEmail,
  MAX_IMPORT_ROWS,
  nextUsername,
  normalizeAcademicYear,
  parseCsv,
  resolveHeaderRow,
} from "@/lib/guru/siswa-utils";

export type Credential = {
  name: string;
  username: string;
  password: string;
  kelas?: string | null;
};

export type SiswaState = {
  error?: string;
  success?: boolean;
  stamp?: number;
  created?: Credential;
};

export type ResetState = {
  error?: string;
  stamp?: number;
  credential?: Credential;
};

export type ImportFailure = {
  row: number;
  name: string;
  email: string;
  reason: string;
};

export type ImportState = {
  error?: string;
  stamp?: number;
  imported?: Credential[];
  failed?: ImportFailure[];
};

/** Satu baris hasil pembacaan file, ditampilkan ke guru sebelum import. */
export type ImportPreviewRow = {
  /** Nomor baris asli di file (1 = header). */
  row: number;
  name: string;
  email: string;
  kelasName: string;
  tahunAjaran: string;
  /** Rencana username (kosong kalau baris bermasalah). */
  username: string;
  /** Kelas yang berhasil dicocokkan, mis. "9A · 2026/2027". */
  kelasLabel: string | null;
  status: "siap" | "gagal";
  reason?: string;
};

export type ImportPreviewState = {
  error?: string;
  stamp?: number;
  fileName?: string;
  rows?: ImportPreviewRow[];
  readyCount?: number;
  failedCount?: number;
};

type KelasRow = { id: number; name: string; academicYear: string };

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

function parseId(value: FormDataEntryValue | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function validateName(name: string): string | null {
  if (!name) return "Nama siswa wajib diisi.";
  if (name.length > 120) return "Nama maksimal 120 karakter.";
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

function refresh() {
  // Halaman guru selalu dynamic (bergantung cookie sesi), jadi tidak perlu
  // revalidatePath. Memanggil revalidatePath di dalam Server Action memicu
  // race di Next 15 yang membuat response action menggantung di produksi.
}

async function findSiswa(id: number) {
  const [row] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      isActive: users.isActive,
      kelasId: users.kelasId,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "siswa")))
    .limit(1);

  return row ?? null;
}

async function loadUsernames(): Promise<Set<string>> {
  const rows = await getDb().select({ username: users.username }).from(users);
  const taken = new Set<string>();

  for (const row of rows) {
    if (row.username) taken.add(row.username.toLowerCase());
  }

  return taken;
}

async function emailTaken(email: string, ignoreId?: number): Promise<boolean> {
  const conditions = [eq(users.email, email)];
  if (ignoreId) conditions.push(ne(users.id, ignoreId));

  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions))
    .limit(1);

  return Boolean(row);
}

/** Validasi kelas dari form: harus ada di database. */
async function validateKelasId(kelasId: number | null): Promise<string | null> {
  if (kelasId === null) return null;

  const [row] = await getDb()
    .select({ id: kelas.id })
    .from(kelas)
    .where(eq(kelas.id, kelasId))
    .limit(1);

  return row ? null : "Kelas yang dipilih tidak ditemukan.";
}

type KelasResolution = { id: number | null; reason?: string };

function resolveKelas(
  rows: KelasRow[],
  rawName: string,
  rawYear: string,
): KelasResolution {
  const name = rawName.trim();

  if (!name) return { id: null };

  const key = name.toLowerCase();
  const candidates = rows.filter((row) => row.name.trim().toLowerCase() === key);

  if (candidates.length === 0) {
    return { id: null, reason: `Kelas "${name}" belum terdaftar di menu Kelas.` };
  }

  const year = normalizeAcademicYear(rawYear);

  if (year) {
    const match = candidates.find((row) => row.academicYear === year);
    if (!match) {
      const years = candidates.map((row) => row.academicYear).join(", ");
      return {
        id: null,
        reason: `Kelas "${name}" tidak ada di tahun ajaran ${year} (tersedia: ${years}).`,
      };
    }

    return { id: match.id };
  }

  if (candidates.length === 1) return { id: candidates[0].id };

  const years = candidates.map((row) => row.academicYear).sort().join(", ");
  return {
    id: null,
    reason: `Kelas "${name}" ada di beberapa tahun ajaran (${years}). Isi kolom tahun_ajaran.`,
  };
}

export async function createSiswa(
  _prevState: SiswaState,
  formData: FormData,
): Promise<SiswaState> {
  await requireUser("guru");

  const name = normalizeText(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const kelasId = parseId(formData.get("kelasId"));

  const error = validateName(name);
  if (error) return { error };

  if (email && !isValidEmail(email)) {
    return { error: "Format email tidak valid." };
  }

  if (email && (await emailTaken(email))) {
    return { error: `Email ${email} sudah dipakai akun lain.` };
  }

  const kelasError = await validateKelasId(kelasId);
  if (kelasError) return { error: kelasError };

  const username = nextUsername(name, await loadUsernames());
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  try {
    await getDb().insert(users).values({
      name,
      email: email || null,
      username,
      passwordHash,
      role: "siswa",
      kelasId,
    });
  } catch (caught) {
    if (isUniqueViolation(caught)) {
      return { error: "Email atau username sudah dipakai. Coba lagi." };
    }
    throw caught;
  }

  let kelasLabel: string | null = null;
  if (kelasId) {
    const [row] = await getDb()
      .select({ name: kelas.name, academicYear: kelas.academicYear })
      .from(kelas)
      .where(eq(kelas.id, kelasId))
      .limit(1);

    if (row) kelasLabel = `${row.name} · ${row.academicYear}`;
  }

  refresh();

  return {
    success: true,
    stamp: Date.now(),
    created: { name, username, password, kelas: kelasLabel },
  };
}

export async function updateSiswa(
  _prevState: SiswaState,
  formData: FormData,
): Promise<SiswaState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Siswa tidak valid." };

  const target = await findSiswa(id);
  if (!target) return { error: "Siswa tidak ditemukan." };

  const name = normalizeText(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const kelasId = parseId(formData.get("kelasId"));

  const error = validateName(name);
  if (error) return { error };

  if (email && !isValidEmail(email)) {
    return { error: "Format email tidak valid." };
  }

  if (email && (await emailTaken(email, id))) {
    return { error: `Email ${email} sudah dipakai akun lain.` };
  }

  const kelasError = await validateKelasId(kelasId);
  if (kelasError) return { error: kelasError };

  try {
    await getDb()
      .update(users)
      .set({ name, email: email || null, kelasId })
      .where(and(eq(users.id, id), eq(users.role, "siswa")));
  } catch (caught) {
    if (isUniqueViolation(caught)) {
      return { error: `Email ${email} sudah dipakai akun lain.` };
    }
    throw caught;
  }

  refresh();

  return { success: true, stamp: Date.now() };
}

export async function resetSiswaPassword(
  _prevState: ResetState,
  formData: FormData,
): Promise<ResetState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Siswa tidak valid." };

  if (formData.get("confirm") !== "yes") {
    return { error: "Konfirmasi reset password diperlukan." };
  }

  const target = await findSiswa(id);
  if (!target || !target.username) {
    return { error: "Siswa tidak ditemukan." };
  }

  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  await getDb().update(users).set({ passwordHash }).where(eq(users.id, id));
  // Password lama tidak berlaku lagi: paksa login ulang.
  await getDb().delete(sessions).where(eq(sessions.userId, id));

  refresh();

  return {
    stamp: Date.now(),
    credential: { name: target.name, username: target.username, password },
  };
}

export async function toggleSiswaActive(
  _prevState: SiswaState,
  formData: FormData,
): Promise<SiswaState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Siswa tidak valid." };

  const target = await findSiswa(id);
  if (!target) return { error: "Siswa tidak ditemukan." };

  const nextActive = !target.isActive;

  await getDb().update(users).set({ isActive: nextActive }).where(eq(users.id, id));

  if (!nextActive) {
    await getDb().delete(sessions).where(eq(sessions.userId, id));
  }

  refresh();

  return { success: true, stamp: Date.now() };
}

export async function deleteSiswa(
  _prevState: SiswaState,
  formData: FormData,
): Promise<SiswaState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Siswa tidak valid." };

  await getDb()
    .delete(users)
    .where(and(eq(users.id, id), eq(users.role, "siswa")));

  refresh();

  return { success: true, stamp: Date.now() };
}

function toCsvRows(text: string): SpreadsheetRow[] {
  return parseCsv(text).map((cells, index) => ({ rowNumber: index + 1, cells }));
}

type PreparedRow = {
  row: number;
  name: string;
  email: string;
  kelasName: string;
  tahunAjaran: string;
  username: string;
  kelasId: number | null;
  kelasLabel: string | null;
  error?: string;
};

type PreparedImport = { error: string } | { rows: PreparedRow[] };

/**
 * Baca file (xlsx/csv) lalu validasi tiap baris TANPA menyentuh database.
 * Dipakai bersama oleh pratinjau (`previewImportSiswa`) dan import sesungguhnya,
 * supaya yang dilihat guru sama persis dengan yang akan disimpan.
 */
async function prepareImport(file: File): Promise<PreparedImport> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { error: "Ukuran file maksimal 2 MB." };
  }

  const buffer = await file.arrayBuffer();
  const format = detectSpreadsheetFormat(buffer);

  let rows: SpreadsheetRow[];

  if (format === "xlsx") {
    try {
      const parsed = await readXlsx(buffer);
      rows = parsed.rows;
    } catch {
      return { error: "File Excel tidak bisa dibaca. Simpan ulang sebagai .xlsx." };
    }
  } else {
    if (/\.xls$/i.test(file.name)) {
      return { error: "Format .xls lama belum didukung. Simpan ulang sebagai .xlsx." };
    }

    rows = toCsvRows(await file.text());
  }

  if (rows.length < 2) {
    return {
      error: 'File kosong. Sertakan header "nama" (boleh juga kelas, tahun_ajaran, email).',
    };
  }

  const headerMap = resolveHeaderRow(rows[0].cells);

  if (headerMap.nama === undefined) {
    return { error: 'Header file harus memiliki kolom "nama".' };
  }

  const dataRows = rows.slice(1);

  if (dataRows.length > MAX_IMPORT_ROWS) {
    return { error: `Maksimal ${MAX_IMPORT_ROWS} siswa per satu kali import.` };
  }

  const [existing, kelasRows] = await Promise.all([
    getDb().select({ email: users.email, username: users.username }).from(users),
    getDb()
      .select({ id: kelas.id, name: kelas.name, academicYear: kelas.academicYear })
      .from(kelas),
  ]);

  const takenUsernames = new Set<string>();
  const takenEmails = new Set<string>();

  for (const row of existing) {
    if (row.username) takenUsernames.add(row.username.toLowerCase());
    if (row.email) takenEmails.add(row.email.toLowerCase());
  }

  const labelFor = (id: number | null): string | null => {
    if (!id) return null;
    const match = kelasRows.find((row) => row.id === id);
    return match ? `${match.name} · ${match.academicYear}` : null;
  };

  const prepared: PreparedRow[] = [];

  dataRows.forEach((row) => {
    const cell = (column: keyof typeof headerMap): string => {
      const index = headerMap[column];
      return index === undefined ? "" : (row.cells[index] ?? "").trim();
    };

    const name = cell("nama");
    const email = cell("email").toLowerCase();
    const kelasName = cell("kelas");
    const tahunAjaran = cell("tahun_ajaran");

    const base: PreparedRow = {
      row: row.rowNumber,
      name,
      email,
      kelasName,
      tahunAjaran,
      username: "",
      kelasId: null,
      kelasLabel: null,
    };

    const nameError = validateName(name);
    if (nameError) {
      prepared.push({ ...base, error: nameError });
      return;
    }

    if (email && !isValidEmail(email)) {
      prepared.push({ ...base, error: "Format email tidak valid." });
      return;
    }

    if (email && takenEmails.has(email)) {
      prepared.push({ ...base, error: "Email sudah dipakai akun lain." });
      return;
    }

    const resolution = resolveKelas(kelasRows, kelasName, tahunAjaran);
    if (resolution.reason) {
      prepared.push({ ...base, error: resolution.reason });
      return;
    }

    const username = nextUsername(name, takenUsernames);
    takenUsernames.add(username);
    if (email) takenEmails.add(email);

    prepared.push({
      ...base,
      username,
      kelasId: resolution.id,
      kelasLabel: labelFor(resolution.id),
    });
  });

  return { rows: prepared };
}

/**
 * Langkah 1: baca & periksa file, kembalikan pratinjau baris untuk dicek guru.
 * Tidak ada INSERT/UPDATE sama sekali di sini.
 */
export async function previewImportSiswa(
  _prevState: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  await requireUser("guru");

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file Excel (.xlsx) atau CSV dulu.", stamp: Date.now() };
  }

  const parsed = await prepareImport(file);

  if ("error" in parsed) return { error: parsed.error, stamp: Date.now() };

  const rows: ImportPreviewRow[] = parsed.rows.map((row) => ({
    row: row.row,
    name: row.name,
    email: row.email,
    kelasName: row.kelasName,
    tahunAjaran: row.tahunAjaran,
    username: row.username,
    kelasLabel: row.kelasLabel,
    status: row.error ? "gagal" : "siap",
    reason: row.error,
  }));

  return {
    stamp: Date.now(),
    fileName: file.name,
    rows,
    readyCount: rows.filter((row) => row.status === "siap").length,
    failedCount: rows.filter((row) => row.status === "gagal").length,
  };
}

/**
 * Langkah 2: import sungguhan. File dibaca & divalidasi ulang (jangan percaya
 * hasil pratinjau di client), lalu baris valid disimpan ke database.
 */
export async function importSiswa(
  _prevState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireUser("guru");

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file Excel (.xlsx) atau CSV dulu.", stamp: Date.now() };
  }

  const parsed = await prepareImport(file);

  if ("error" in parsed) return { error: parsed.error, stamp: Date.now() };

  const failed: ImportFailure[] = [];
  const pending: {
    row: number;
    name: string;
    email: string | null;
    username: string;
    password: string;
    kelasId: number | null;
    kelasLabel: string | null;
  }[] = [];

  for (const row of parsed.rows) {
    if (row.error) {
      failed.push({ row: row.row, name: row.name, email: row.email, reason: row.error });
      continue;
    }

    pending.push({
      row: row.row,
      name: row.name,
      email: row.email || null,
      username: row.username,
      password: generatePassword(),
      kelasId: row.kelasId,
      kelasLabel: row.kelasLabel,
    });
  }

  // scrypt cukup berat; hash beberapa sekaligus tapi dibatasi supaya memori aman.
  const CHUNK_SIZE = 4;
  const imported: Credential[] = [];

  for (let start = 0; start < pending.length; start += CHUNK_SIZE) {
    const chunk = pending.slice(start, start + CHUNK_SIZE);
    const hashes = await Promise.all(chunk.map((item) => hashPassword(item.password)));

    for (let index = 0; index < chunk.length; index += 1) {
      const item = chunk[index];

      try {
        await getDb().insert(users).values({
          name: item.name,
          email: item.email,
          username: item.username,
          passwordHash: hashes[index],
          role: "siswa",
          kelasId: item.kelasId,
        });

        imported.push({
          name: item.name,
          username: item.username,
          password: item.password,
          kelas: item.kelasLabel,
        });
      } catch (caught) {
        if (!isUniqueViolation(caught)) throw caught;

        failed.push({
          row: item.row,
          name: item.name,
          email: item.email ?? "",
          reason: "Email atau username sudah dipakai.",
        });
      }
    }
  }

  if (imported.length > 0) refresh();

  failed.sort((a, b) => a.row - b.row);

  return {
    stamp: Date.now(),
    imported,
    failed,
  };
}
