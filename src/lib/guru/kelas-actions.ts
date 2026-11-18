"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { kelas } from "@/lib/db/schema";
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
