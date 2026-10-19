"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import {
  MAX_FILE_SIZE,
  MAX_ROWS,
  parseKredensialXlsx,
  type BarisImportKredensial,
} from "@/lib/parse-kredensial-xlsx";
import { hashPassword } from "@/lib/hash-password";
import { requireGuru } from "@/lib/require-guru";
import { banyakBaris, jalankan } from "@/lib/db";

// ============================================================================
// Aksi kredensial siswa: import massal dari Excel + buat otomatis.
// Semua aksi memverifikasi sesi guru dulu (requireGuru).
// ============================================================================

type SiswaRef = { id: string; nis: string | null; nama_siswa: string; kelas_id: string | null };

async function ambilSiswa() {
  try {
    const siswa = await banyakBaris<SiswaRef>(
      `select id, nis, nama_siswa, kelas_id from students`,
    );
    return { siswa, error: null };
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { siswa: [] as SiswaRef[], error: pesan };
  }
}

async function ambilUsernameTerpakai() {
  try {
    const data = await banyakBaris<{ username: string; siswa_id: string }>(
      `select username, siswa_id from student_accounts`,
    );
    return { data, error: null };
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { data: [] as { username: string; siswa_id: string }[], error: pesan };
  }
}

// ----------------------------------------------------------------------------
// PRATINJAU IMPORT KREDENSIAL
// ----------------------------------------------------------------------------
export type HasilPreviewKredensial = {
  rows: BarisImportKredensial[];
  error: string | null;
};

export async function previewKredensial(
  _prevState: HasilPreviewKredensial,
  formData: FormData,
): Promise<HasilPreviewKredensial> {
  await requireGuru();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { rows: [], error: "Pilih file Excel (.xlsx) terlebih dahulu." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { rows: [], error: "Ukuran file maksimal 2 MB." };
  }

  const siswaRes = await ambilSiswa();
  if (siswaRes.error) {
    return { rows: [], error: `Gagal memuat data siswa: ${siswaRes.error}` };
  }

  let kelasData: { id: string; nama_kelas: string }[];
  try {
    kelasData = await banyakBaris<{ id: string; nama_kelas: string }>(
      `select id, nama_kelas from classes`,
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { rows: [], error: `Gagal memuat data kelas: ${pesan}` };
  }

  const usernameRes = await ambilUsernameTerpakai();
  if (usernameRes.error) {
    return { rows: [], error: `Gagal memuat akun: ${usernameRes.error}` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return parseKredensialXlsx(
    buffer,
    siswaRes.siswa,
    kelasData,
    usernameRes.data,
  );
}

// ----------------------------------------------------------------------------
// SIMPAN IMPORT KREDENSIAL
// ----------------------------------------------------------------------------
export type HasilSimpanKredensial = {
  jumlah: number;
  dilewati: number;
  error: string | null;
};

export async function simpanImportKredensial(
  _prevState: HasilSimpanKredensial,
  formData: FormData,
): Promise<HasilSimpanKredensial> {
  await requireGuru();

  let input: unknown;
  try {
    input = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { jumlah: 0, dilewati: 0, error: "Data pratinjau tidak valid. Ulangi pilih file." };
  }

  if (!Array.isArray(input) || input.length === 0) {
    return { jumlah: 0, dilewati: 0, error: "Tidak ada baris valid untuk diimport." };
  }
  if (input.length > MAX_ROWS) {
    return { jumlah: 0, dilewati: 0, error: `Maksimal ${MAX_ROWS} baris per import.` };
  }

  // Ambil daftar siswa (kunci NIS) & username yang sudah terpakai.
  const siswaRes = await ambilSiswa();
  if (siswaRes.error) {
    return { jumlah: 0, dilewati: 0, error: `Gagal memuat data siswa: ${siswaRes.error}` };
  }

  const usernameRes = await ambilUsernameTerpakai();
  if (usernameRes.error) {
    return { jumlah: 0, dilewati: 0, error: `Gagal memuat akun: ${usernameRes.error}` };
  }

  const nisMap = new Map<string, SiswaRef>();
  for (const s of siswaRes.siswa) {
    if (s.nis) nisMap.set(s.nis, s);
  }

  const usernameTerpakaiGlobal = new Set(
    usernameRes.data.map((u) => u.username.toLowerCase()),
  );
  const usernameTerpakaiPerSiswa = new Map<string, string>();
  for (const u of usernameRes.data) {
    usernameTerpakaiPerSiswa.set(u.siswa_id, u.username.toLowerCase());
  }

  let jumlah = 0;
  let dilewati = 0;

  for (const item of input) {
    if (typeof item !== "object" || item === null) {
      dilewati += 1;
      continue;
    }

    const baris = item as {
      nis?: unknown;
      username?: unknown;
      password?: unknown;
    };
    const nis = typeof baris.nis === "string" ? baris.nis.trim() : "";
    const username = typeof baris.username === "string" ? baris.username.trim() : "";
    const password = typeof baris.password === "string" ? baris.password : "";

    if (!nis || !username || !password) {
      dilewati += 1;
      continue;
    }

    const siswa = nisMap.get(nis);
    if (!siswa) {
      dilewati += 1;
      continue;
    }

    const usernameNorm = username.toLowerCase();

    // Cek konflik username global (kecuali siswa ini sendiri).
    if (usernameTerpakaiGlobal.has(usernameNorm)) {
      const milikSiswaIni = usernameTerpakaiPerSiswa.get(siswa.id);
      if (milikSiswaIni === undefined || milikSiswaIni !== usernameNorm) {
        dilewati += 1;
        continue;
      }
      // Update password siswa ini (username sama).
    }

    const hash = hashPassword(password);

    try {
      // Insert kalau belum ada akun, update kalau sudah (unique siswa_id).
      await jalankan(
        `insert into student_accounts (siswa_id, username, password_hash)
         values ($1, $2, $3)
         on conflict (siswa_id)
         do update set username = excluded.username,
                       password_hash = excluded.password_hash`,
        [siswa.id, username, hash],
      );
    } catch {
      dilewati += 1;
      continue;
    }

    // Update indeks lokal supaya baris berikutnya tahu username sudah terpakai.
    usernameTerpakaiGlobal.add(usernameNorm);
    usernameTerpakaiPerSiswa.set(siswa.id, usernameNorm);
    jumlah += 1;
  }

  revalidatePath("/guru/siswa");
  return { jumlah, dilewati, error: null };
}

// ----------------------------------------------------------------------------
// BUAT KREDENSIAL OTOMATIS
// ----------------------------------------------------------------------------
export type KredensialOtomatis = {
  nama: string;
  nis: string;
  username: string;
  password: string;
};

export type HasilBuatOtomatis = {
  dibuat: KredensialOtomatis[];
  error: string | null;
};

// Ambil maksimal 2 kata pertama dari nama, dipisah dengan "-".
// Contoh: "Muhammad Budi Santoso" → "muhammad-budi"
//         "Siti"                  → "siti"
function duaKataDepan(nama: string): string {
  return nama
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata.toLowerCase())
    .join("-");
}

function acakHanging(karakter: string, panjang: number): string {
  const bytes = randomBytes(panjang);
  let hasil = "";
  for (let i = 0; i < panjang; i++) {
    hasil += karakter[bytes[i] % karakter.length];
  }
  return hasil;
}

export async function buatKredensialOtomatis(
  _prevState: HasilBuatOtomatis,
  formData: FormData,
): Promise<HasilBuatOtomatis> {
  await requireGuru();

  // Filter kelas (kosong = semua kelas).
  const kelasPilihan = String(formData.get("kelas") ?? "").trim();

  let semuaSiswa: { id: string; nis: string | null; nama_siswa: string }[];
  try {
    semuaSiswa = kelasPilihan
      ? await banyakBaris<{ id: string; nis: string | null; nama_siswa: string }>(
          `select id, nis, nama_siswa from students where kelas_id = $1`,
          [kelasPilihan],
        )
      : await banyakBaris<{ id: string; nis: string | null; nama_siswa: string }>(
          `select id, nis, nama_siswa from students`,
        );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { dibuat: [], error: `Gagal memuat siswa: ${pesan}` };
  }

  const akunRes = await ambilUsernameTerpakai();
  if (akunRes.error) {
    return { dibuat: [], error: `Gagal memuat akun: ${akunRes.error}` };
  }

  const akunTerpakai = new Set(akunRes.data.map((a) => a.siswa_id));

  const siswaTanpaAkun = semuaSiswa.filter((s) => !akunTerpakai.has(s.id));

  if (siswaTanpaAkun.length === 0) {
    return { dibuat: [], error: null };
  }

  const usernameTerpakai = new Set<string>();
  for (const a of akunRes.data) {
    usernameTerpakai.add(a.username.toLowerCase());
  }

  const dibuat: KredensialOtomatis[] = [];

  for (const siswa of siswaTanpaAkun) {
    // Username = 2 kata depan nama + suffix acak 4 karakter.
    let username = duaKataDepan(siswa.nama_siswa);
    if (!username) username = "siswa";

    const suffix = acakHanging("abcdefghijklmnopqrstuvwxyz0123456789", 4);
    let calon = `${username}-${suffix}`.toLowerCase();

    // Kalau masih bentrok, tambah suffix lagi sampai unik (maks 5 percobaan).
    for (let i = 0; i < 5 && usernameTerpakai.has(calon); i++) {
      const suffixLagi = acakHanging("0123456789", 4);
      calon = `${username}-${suffix}-${suffixLagi}`.toLowerCase();
    }

    if (usernameTerpakai.has(calon)) {
      // Langkah terakhir: pakai NIS + acak.
      const acak = acakHanging("abcdefghijklmnopqrstuvwxyz0123456789", 6);
      calon = siswa.nis ? `${siswa.nis}-${acak}`.toLowerCase() : `siswa-${acak}`;
    }

    const password = acakHanging("abcdefghjkmnpqrstuvwxyz23456789", 8);
    const hash = hashPassword(password);

    try {
      await jalankan(
        `insert into student_accounts (siswa_id, username, password_hash)
         values ($1, $2, $3)`,
        [siswa.id, calon, hash],
      );
    } catch {
      // Gagal insert (mis. konflik unik), lewati siswa ini.
      continue;
    }

    usernameTerpakai.add(calon.toLowerCase());
    dibuat.push({
      nama: siswa.nama_siswa,
      nis: siswa.nis ?? "-",
      username: calon,
      password,
    });
  }

  revalidatePath("/guru/siswa");
  return { dibuat, error: null };
}
