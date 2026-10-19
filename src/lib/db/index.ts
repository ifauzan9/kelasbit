import "server-only";

import { Pool } from "pg";

// ============================================================================
// Koneksi PostgreSQL (hosting cPanel) — pengganti Supabase client.
//
// Semua akses database melewati satu Pool di sisi server. Tidak ada lagi
// client "anon" vs "service-role": RLS Supabase sudah tidak dipakai, sehingga
// setiap Server Action WAJIB memanggil requireGuru()/requireSiswa() sendiri.
//
// Pool dibuat lazy (baru saat query pertama) supaya proses Passenger yang
// diidlekan tidak membuka koneksi yang sudah mati di server database.
// ============================================================================

declare global {
  var __dbPool: Pool | undefined;
}

function sslAktif(): false | { rejectUnauthorized: boolean } {
  const nilai = (process.env.DATABASE_SSL ?? "").trim().toLowerCase();
  if (nilai === "1" || nilai === "true" || nilai === "on") {
    return { rejectUnauthorized: false };
  }
  return false;
}

function buatPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diisi. Contoh: postgresql://user:pass@localhost:5432/nama_db",
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: sslAktif(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Cegah proses crash kalau koneksi idle diputus server database.
  pool.on("error", (err) => {
    console.error("Koneksi PostgreSQL error:", err.message);
  });

  return pool;
}

export function db(): Pool {
  if (!globalThis.__dbPool) {
    globalThis.__dbPool = buatPool();
  }
  return globalThis.__dbPool;
}

export class GalatDatabase extends Error {
  constructor(
    pesan: string,
    readonly kode?: string,
    readonly detail?: string,
  ) {
    super(pesan);
    this.name = "GalatDatabase";
  }
}

// Jalankan query; kembalikan seluruh baris.
export async function banyakBaris<T extends object>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    const hasil = await db().query(sql, params);
    return hasil.rows as T[];
  } catch (err) {
    throw normalkanGalat(err);
  }
}

// Jalankan query; kembalikan satu baris atau null.
export async function satuBaris<T extends object>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const baris = await banyakBaris<T>(sql, params);
  if (baris.length > 1) {
    throw new GalatDatabase(
      `Query mengembalikan ${baris.length} baris, seharusnya paling banyak 1.`,
    );
  }
  return baris[0] ?? null;
}

// Jalankan query mutasi (insert/update/delete) tanpa hasil.
export async function jalankan(
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  try {
    const hasil = await db().query(sql, params);
    return hasil.rowCount ?? 0;
  } catch (err) {
    throw normalkanGalat(err);
  }
}

function normalkanGalat(err: unknown): GalatDatabase {
  if (err instanceof GalatDatabase) return err;
  const e = err as { message?: string; code?: string; detail?: string };
  return new GalatDatabase(
    e?.message ?? "Galat database tidak diketahui.",
    e?.code,
    e?.detail,
  );
}

// Buat daftar placeholder "$1, $2, ..." untuk dipakai pada "in (...)".
export function placeholders(jumlah: number, mulaiDari = 1): string {
  return Array.from({ length: jumlah }, (_, i) => `$${mulaiDari + i}`).join(", ");
}
