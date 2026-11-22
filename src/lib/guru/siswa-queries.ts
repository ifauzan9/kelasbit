import { and, asc, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { kelas, users } from "@/lib/db/schema";

export async function listSiswa() {
  return getDb()
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      isActive: users.isActive,
      kelasId: users.kelasId,
      kelasName: kelas.name,
      academicYear: kelas.academicYear,
    })
    .from(users)
    .leftJoin(kelas, eq(kelas.id, users.kelasId))
    .where(eq(users.role, "siswa"))
    .orderBy(asc(users.name));
}

export async function getSiswa(id: number) {
  if (!Number.isInteger(id) || id <= 0) return null;

  const [row] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      isActive: users.isActive,
      kelasId: users.kelasId,
      kelasName: kelas.name,
      academicYear: kelas.academicYear,
    })
    .from(users)
    .leftJoin(kelas, eq(kelas.id, users.kelasId))
    .where(and(eq(users.id, id), eq(users.role, "siswa")))
    .limit(1);

  return row ?? null;
}

export async function countSiswa(): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(users)
    .where(eq(users.role, "siswa"));

  return row?.total ?? 0;
}

/** Daftar kelas + jumlah siswa, dipakai dropdown dan halaman kelas. */
export async function listKelasWithCount() {
  return getDb()
    .select({
      id: kelas.id,
      name: kelas.name,
      academicYear: kelas.academicYear,
      studentCount: sql<number>`count(${users.id})::int`,
    })
    .from(kelas)
    .leftJoin(users, sql`${users.kelasId} = ${kelas.id} and ${users.role} = 'siswa'`)
    .groupBy(kelas.id, kelas.name, kelas.academicYear)
    .orderBy(asc(kelas.name), asc(kelas.academicYear));
}
