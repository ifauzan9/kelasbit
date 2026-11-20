"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { kelas } from "@/lib/db/schema";
import {
  isValidKelasTokenFormat,
  normalizeKelasToken,
} from "@/lib/auth/kelas-token-format";
import { generateKelasToken } from "@/lib/auth/kelas-token";
import { isValidAcademicYear } from "@/lib/guru/constants";

export type KelasState = {
  error?: string;
  success?: boolean;
  stamp?: number;
};

function parseForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const academicYear = String(formData.get("academicYear") ?? "").trim();

  return { name, academicYear };
}

function validate(name: string, academicYear: string): string | null {
  if (!name) return "Nama kelas wajib diisi.";
  if (name.length > 40) return "Nama kelas maksimal 40 karakter.";
  if (!isValidAcademicYear(academicYear)) return "Tahun ajaran tidak valid.";
  return null;
}

function parseId(value: FormDataEntryValue | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function duplicateMessage(name: string, academicYear: string) {
  return `Kelas ${name} tahun ajaran ${academicYear} sudah ada.`;
}

async function isDuplicate(
  name: string,
  academicYear: string,
  ignoreId?: number,
): Promise<boolean> {
  const conditions = [
    sql`lower(${kelas.name}) = lower(${name})`,
    eq(kelas.academicYear, academicYear),
  ];

  if (ignoreId) conditions.push(ne(kelas.id, ignoreId));

  const [row] = await getDb()
    .select({ id: kelas.id })
    .from(kelas)
    .where(and(...conditions))
    .limit(1);

  return Boolean(row);
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
  // Lihat catatan di siswa-actions.ts: hindari revalidatePath di Server Action.
}

export async function createKelas(
  _prevState: KelasState,
  formData: FormData,
): Promise<KelasState> {
  await requireUser("guru");

  const { name, academicYear } = parseForm(formData);

  const error = validate(name, academicYear);
  if (error) return { error };

  if (await isDuplicate(name, academicYear)) {
    return { error: duplicateMessage(name, academicYear) };
  }

  try {
    await getDb().insert(kelas).values({ name, academicYear });
  } catch (caught) {
    if (isUniqueViolation(caught)) {
      return { error: duplicateMessage(name, academicYear) };
    }
    throw caught;
  }

  refresh();

  return { success: true, stamp: Date.now() };
}

export async function updateKelas(
  _prevState: KelasState,
  formData: FormData,
): Promise<KelasState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Kelas tidak valid." };

  const { name, academicYear } = parseForm(formData);

  const error = validate(name, academicYear);
  if (error) return { error };

  if (await isDuplicate(name, academicYear, id)) {
    return { error: duplicateMessage(name, academicYear) };
  }

  try {
    await getDb()
      .update(kelas)
      .set({ name, academicYear, updatedAt: new Date() })
      .where(eq(kelas.id, id));
  } catch (caught) {
    if (isUniqueViolation(caught)) {
      return { error: duplicateMessage(name, academicYear) };
    }
    throw caught;
  }

  refresh();

  return { success: true, stamp: Date.now() };
}

export async function deleteKelas(
  _prevState: KelasState,
  formData: FormData,
): Promise<KelasState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Kelas tidak valid." };

  await getDb().delete(kelas).where(eq(kelas.id, id));
  refresh();

  return { success: true, stamp: Date.now() };
}

export type KelasTokenState = {
  error?: string;
  success?: boolean;
  stamp?: number;
  token?: string | null;
  enabled?: boolean;
};

async function generateUniqueLoginToken(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = generateKelasToken();
    const [row] = await getDb()
      .select({ id: kelas.id })
      .from(kelas)
      .where(eq(kelas.loginToken, token))
      .limit(1);

    if (!row) return token;
  }

  throw new Error("Gagal membuat token unik setelah beberapa percobaan.");
}

export async function setKelasTokenLogin(
  _prevState: KelasTokenState,
  formData: FormData,
): Promise<KelasTokenState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Kelas tidak valid." };

  const enabled = formData.get("enabled") === "true";

  try {
    const [row] = await getDb()
      .select({ loginToken: kelas.loginToken })
      .from(kelas)
      .where(eq(kelas.id, id))
      .limit(1);

    if (!row) return { error: "Kelas tidak ditemukan." };

    let token = row.loginToken;

    if (enabled && !token) {
      token = await generateUniqueLoginToken();
    }

    await getDb()
      .update(kelas)
      .set({
        loginToken: token,
        tokenLoginEnabled: enabled,
        tokenUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kelas.id, id));

    return { success: true, stamp: Date.now(), enabled, token };
  } catch (error) {
    console.error("kelas: gagal mengubah pengaturan token login", error);
    return { error: "Gagal menyimpan pengaturan token. Coba lagi." };
  }
}

const TOKEN_FORMAT_ERROR =
  "Token harus 6 karakter: huruf A–Z dan angka 2–9 (tanpa I, O, 0, 1).";
const TOKEN_DUPLICATE_ERROR =
  "Token itu sudah dipakai kelas lain. Gunakan token lain.";

/** Simpan token yang diketik guru sendiri (harus unik dan sesuai format login). */
export async function setKelasTokenManual(
  _prevState: KelasTokenState,
  formData: FormData,
): Promise<KelasTokenState> {
  await requireUser("guru");

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Kelas tidak valid." };

  const token = normalizeKelasToken(String(formData.get("token") ?? ""));

  if (!isValidKelasTokenFormat(token)) {
    return { error: TOKEN_FORMAT_ERROR };
  }

  try {
    const [duplicate] = await getDb()
      .select({ id: kelas.id })
      .from(kelas)
      .where(and(eq(kelas.loginToken, token), ne(kelas.id, id)))
      .limit(1);

    if (duplicate) return { error: TOKEN_DUPLICATE_ERROR };

    const [updated] = await getDb()
      .update(kelas)
      .set({
        loginToken: token,
        tokenUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kelas.id, id))
      .returning({ enabled: kelas.tokenLoginEnabled });

    if (!updated) return { error: "Kelas tidak ditemukan." };

    return {
      success: true,
      stamp: Date.now(),
      token,
      enabled: updated.enabled,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: TOKEN_DUPLICATE_ERROR };
    }
    console.error("kelas: gagal menyimpan token manual", error);
    return { error: "Gagal menyimpan token. Coba lagi." };
  }
}

export async function rotateKelasToken(
  _prevState: KelasTokenState,
  formData: FormData,
): Promise<KelasTokenState> {
  await requireUser("guru");

  if (formData.get("intent") !== "rotate") {
    return { error: "Permintaan tidak valid." };
  }

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Kelas tidak valid." };

  try {
    const token = await generateUniqueLoginToken();

    const [updated] = await getDb()
      .update(kelas)
      .set({ loginToken: token, tokenUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(kelas.id, id))
      .returning({ enabled: kelas.tokenLoginEnabled });

    if (!updated) return { error: "Kelas tidak ditemukan." };

    return { success: true, stamp: Date.now(), token, enabled: updated.enabled };
  } catch (error) {
    console.error("kelas: gagal mengganti token login", error);
    return { error: "Gagal membuat token baru. Coba lagi." };
  }
}

export async function removeKelasToken(
  _prevState: KelasTokenState,
  formData: FormData,
): Promise<KelasTokenState> {
  await requireUser("guru");

  if (formData.get("intent") !== "remove") {
    return { error: "Permintaan tidak valid." };
  }

  const id = parseId(formData.get("id"));
  if (!id) return { error: "Kelas tidak valid." };

  try {
    const [updated] = await getDb()
      .update(kelas)
      .set({
        loginToken: null,
        tokenLoginEnabled: false,
        tokenUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kelas.id, id))
      .returning({ id: kelas.id });

    if (!updated) return { error: "Kelas tidak ditemukan." };

    return { success: true, stamp: Date.now(), token: null, enabled: false };
  } catch (error) {
    console.error("kelas: gagal menghapus token login", error);
    return { error: "Gagal menghapus token. Coba lagi." };
  }
}
