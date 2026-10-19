// Membuat (atau mengganti password) akun guru untuk login ke /login.
//
// Jalankan di server (cPanel) dari root proyek:
//   node scripts/buat-akun-guru.mjs <username> <password>
//
// Script ini membaca DATABASE_URL dari environment atau dari .env.local/.env.

import { pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";

const ITERASI = 100_000;
const PANJANG_HASH = 32;
const PANJANG_SALT = 16;

function hashPassword(password) {
  const salt = randomBytes(PANJANG_SALT);
  const hash = pbkdf2Sync(password, salt, ITERASI, PANJANG_HASH, "sha256");
  return `pbkdf2$${ITERASI}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function bacaEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  for (const nama of [".env.local", ".env"]) {
    if (!existsSync(nama)) continue;
    const isi = readFileSync(nama, "utf8");
    for (const baris of isi.split(/\r?\n/)) {
      const cocok = baris.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
      if (cocok) return cocok[1].replace(/^["']|["']$/g, "").trim();
    }
  }

  throw new Error("DATABASE_URL tidak ditemukan di environment / .env.local.");
}

const [usernameArg, password] = process.argv.slice(2);

if (!usernameArg || !password) {
  console.error("Pakai: node scripts/buat-akun-guru.mjs <username> <password>");
  process.exit(1);
}

const username = usernameArg.trim().toLowerCase();

if (username.length < 3 || username.length > 50) {
  console.error("Username harus 3-50 karakter.");
  process.exit(1);
}

if (password.length < 6) {
  console.error("Password minimal 6 karakter.");
  process.exit(1);
}

const client = new Client({
  connectionString: bacaEnv(),
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

try {
  await client.connect();

  const hash = hashPassword(password);
  const sudahAda = await client.query(
    `select id from guru_accounts where lower(username) = $1`,
    [username],
  );

  let hasil;
  if (sudahAda.rowCount && sudahAda.rowCount > 0) {
    // Username sudah dipakai → ganti password + pastikan aktif.
    hasil = await client.query(
      `update guru_accounts
       set password_hash = $2, is_active = true
       where lower(username) = $1
       returning id, username`,
      [username, hash],
    );
    console.log(
      `Akun guru diperbarui: ${hasil.rows[0].username} (id ${hasil.rows[0].id})`,
    );
  } else {
    hasil = await client.query(
      `insert into guru_accounts (username, password_hash)
       values ($1, $2)
       returning id, username`,
      [username, hash],
    );
    console.log(
      `Akun guru dibuat: ${hasil.rows[0].username} (id ${hasil.rows[0].id})`,
    );
  }
} catch (err) {
  console.error("GAGAL:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
