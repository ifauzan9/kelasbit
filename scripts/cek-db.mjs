// Uji koneksi database memakai DATABASE_URL (env atau .env.local).
// Jalankan di hosting: node scripts/cek-db.mjs
import { existsSync, readFileSync } from "node:fs";
import { Pool } from "pg";

function bacaEnvLokal() {
  const jalur = new URL("../.env.local", import.meta.url);
  if (!existsSync(jalur)) return null;
  return readFileSync(jalur, "utf8")
    .split(/\r?\n/)
    .find((b) => /^DATABASE_URL=/.test(b))
    ?.slice("DATABASE_URL=".length)
    ?.trim();
}

const url = process.env.DATABASE_URL || bacaEnvLokal();

if (!url) {
  console.error("DATABASE_URL tidak ditemukan (env atau .env.local)");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
try {
  const versi = await pool.query("select version()");
  console.log("TERHUBUNG:", versi.rows[0].version.split(",")[0]);

  const tabel = await pool.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' order by table_name`,
  );
  console.log(`Jumlah tabel: ${tabel.rows.length}`);
  console.log(tabel.rows.map((r) => r.table_name).join(", "));

  const guru = await pool.query("select count(*)::int as n from guru_accounts");
  console.log(`Akun guru: ${guru.rows[0].n}`);
} catch (err) {
  console.error("GAGAL:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
