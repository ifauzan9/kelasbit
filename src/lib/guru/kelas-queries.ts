import { asc, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { kelas, users } from "@/lib/db/schema";

export async function listKelas() {
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
    .orderBy(desc(kelas.academicYear), asc(kelas.name));
}
