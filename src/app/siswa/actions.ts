"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { banyakBaris, jalankan, satuBaris } from "@/lib/db";
import { hashPassword, verifikasiPassword } from "@/lib/hash-password";
import { hapusSesiSesi, simpanSesiSesi, ambilSesiSiswa } from "@/lib/sesi-siswa";
import {
  ambilIp,
  catatGagal,
  cekBlokir,
  pesanTerlaluBanyak,
  resetGagal,
} from "@/lib/rate-limit";

// ============================================================================
// Aksi auth siswa (login, logout, ganti password).
// Login memakai username + password yang diatur guru (bukan Supabase Auth).
// Password di-hash PBKDF2 dan diverifikasi di server.
// ============================================================================

export type HasilLogin = { message: string | null };

type DataLog = {
  siswaId: string | null;
  username: string;
  berhasil: boolean;
  alasan: string | null;
};

// Catat percobaan login siswa ke tabel login_logs.
// Dijalankan lewat after() agar penulisan log TIDAK menambah waktu tunggu
// login (dieksekusi setelah respons dikirim). Best-effort.
async function catatLogLogin(data: DataLog) {
  let ip = "unknown";
  let userAgent = "";
  try {
    const h = await headers();
    userAgent = (h.get("user-agent") ?? "").slice(0, 500);
    const xff = h.get("x-forwarded-for");
    ip = xff
      ? xff.split(",")[0]?.trim() || "unknown"
      : h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    // abaikan
  }

  after(async () => {
    try {
      await jalankan(
        `insert into login_logs
           (siswa_id, username, berhasil, alasan, ip, user_agent)
         values ($1, $2, $3, $4, $5, $6)`,
        [data.siswaId, data.username, data.berhasil, data.alasan, ip, userAgent],
      );
    } catch {
      // abaikan
    }
  });
}

export async function loginSiswa(
  _prevState: HasilLogin,
  formData: FormData,
): Promise<HasilLogin> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { message: "Username dan password wajib diisi." };
  }

  // Pembatasan percobaan login (anti brute force / spam).
  const kunci = `siswa:${await ambilIp()}:${username.toLowerCase()}`;
  const cek = cekBlokir(kunci);
  if (!cek.boleh) {
    await catatLogLogin({
      siswaId: null,
      username,
      berhasil: false,
      alasan: "diblokir",
    });
    return { message: pesanTerlaluBanyak(cek.sisaDetik) };
  }

  // Cari akun siswa berdasarkan username (case-insensitive).
  type AkunRow = {
    id: string;
    username: string;
    password_hash: string;
    is_active: boolean;
    siswa_id: string;
    nama_siswa: string;
  };

  let account: AkunRow | null = null;
  try {
    account = await satuBaris<AkunRow>(
      `select sa.id, sa.username, sa.password_hash, sa.is_active,
              s.id as siswa_id, s.nama_siswa
       from student_accounts sa
       join students s on s.id = sa.siswa_id
       where lower(sa.username) = lower($1)`,
      [username],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal memuat akun: ${pesan}` };
  }

  // Pesan disamarkan agar tidak membocorkan apakah username terdaftar.
  if (!account) {
    catatGagal(kunci);
    await catatLogLogin({
      siswaId: null,
      username,
      berhasil: false,
      alasan: "username_tidak_ditemukan",
    });
    return { message: "Username atau password salah." };
  }

  const siswaId = account.siswa_id;

  // Akun nonaktif tidak boleh login.
  if (!account.is_active) {
    catatGagal(kunci);
    await catatLogLogin({
      siswaId,
      username,
      berhasil: false,
      alasan: "akun_nonaktif",
    });
    return { message: "Akun kamu dinonaktifkan. Hubungi gurumu." };
  }

  if (!verifikasiPassword(password, account.password_hash)) {
    catatGagal(kunci);
    await catatLogLogin({
      siswaId,
      username,
      berhasil: false,
      alasan: "password_salah",
    });
    return { message: "Username atau password salah." };
  }

  // Password benar → reset penghitung percobaan gagal.
  resetGagal(kunci);
  await catatLogLogin({ siswaId, username, berhasil: true, alasan: null });

  // Simpan cookie sesi lalu arahkan ke dashboard siswa.
  await simpanSesiSesi({ siswaId, username });
  redirect("/siswa");
}

export async function logoutSiswa() {
  await hapusSesiSesi();
  redirect("/login-siswa");
}

// ============================================================================
// Login siswa memakai TOKEN KELAS.
// Field: kelas_id, siswa_id, token
// Token dibuat/diatur guru per kelas.
// ============================================================================

export async function loginSiswaToken(
  _prevState: HasilLogin,
  formData: FormData,
): Promise<HasilLogin> {
  const kelasId = String(formData.get("kelas_id") ?? "").trim();
  const siswaId = String(formData.get("siswa_id") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim().toUpperCase();

  if (!kelasId || !siswaId || !token) {
    return { message: "Kelas, nama, dan token wajib dipilih/diisi." };
  }

  // Pembatasan percobaan (anti brute force) per IP + kelas.
  const kunci = `siswa-token:${await ambilIp()}:${kelasId}`;
  const cek = cekBlokir(kunci);
  if (!cek.boleh) {
    await catatLogLogin({
      siswaId: null,
      username: `token:${kelasId}`,
      berhasil: false,
      alasan: "diblokir",
    });
    return { message: pesanTerlaluBanyak(cek.sisaDetik) };
  }

  // Pastikan siswa memang terdaftar di kelas yang dipilih (cegah manipulasi).
  const dataSiswa = await satuBaris<{
    id: string;
    nama_siswa: string;
    kelas_id: string | null;
  }>(
    `select id, nama_siswa, kelas_id from students where id = $1`,
    [siswaId],
  );

  if (!dataSiswa || dataSiswa.kelas_id !== kelasId) {
    catatGagal(kunci);
    await catatLogLogin({
      siswaId: null,
      username: `token:${kelasId}`,
      berhasil: false,
      alasan: "siswa_bukan_di_kelas",
    });
    return { message: "Data kelas atau nama tidak cocok. Coba pilih ulang." };
  }

  // Ambil token kelas.
  const tokenRow = await satuBaris<{ token: string }>(
    `select token from class_tokens where kelas_id = $1`,
    [kelasId],
  );

  const tokenSimpan = (tokenRow?.token ?? "").trim().toUpperCase();

  if (!tokenSimpan) {
    catatGagal(kunci);
    await catatLogLogin({
      siswaId,
      username: `token:${kelasId}`,
      berhasil: false,
      alasan: "token_kelas_belum_dibuat",
    });
    return {
      message: "Kelas ini belum punya token. Tanyakan ke gurumu.",
    };
  }

  if (token !== tokenSimpan) {
    catatGagal(kunci);
    await catatLogLogin({
      siswaId,
      username: `token:${kelasId}`,
      berhasil: false,
      alasan: "token_salah",
    });
    return { message: "Token kelas salah. Cek lagi dengan gurumu." };
  }

  // Token benar → reset penghitung gagal, catat log, buat sesi.
  resetGagal(kunci);
  await catatLogLogin({
    siswaId,
    username: `token:${kelasId}`,
    berhasil: true,
    alasan: null,
  });

  await simpanSesiSesi({ siswaId: dataSiswa.id, username: `token:${kelasId}` });
  redirect("/siswa");
}

// ============================================================================
// Ganti password (siswa atur sendiri).
// ============================================================================

export type HasilGantiPassword = {
  message: string | null;
  sukses: boolean;
};

export async function gantiPassword(
  _prevState: HasilGantiPassword,
  formData: FormData,
): Promise<HasilGantiPassword> {
  const sesi = await ambilSesiSiswa();
  if (!sesi) redirect("/login-siswa");

  const account = await satuBaris<{
    id: string;
    password_hash: string;
    is_active: boolean;
  }>(
    `select id, password_hash, is_active
     from student_accounts
     where lower(username) = lower($1)`,
    [sesi.username],
  );

  if (!account || !account.is_active) {
    await hapusSesiSesi();
    redirect("/login-siswa");
  }

  const passwordLama = String(formData.get("password_lama") ?? "");
  const passwordBaru = String(formData.get("password_baru") ?? "");
  const passwordKonfirmasi = String(formData.get("password_konfirmasi") ?? "");

  if (!verifikasiPassword(passwordLama, account.password_hash)) {
    return { message: "Password lama salah.", sukses: false };
  }

  if (passwordBaru.length < 6) {
    return { message: "Password baru minimal 6 karakter.", sukses: false };
  }

  if (passwordBaru !== passwordKonfirmasi) {
    return { message: "Konfirmasi password tidak cocok.", sukses: false };
  }

  const hashBaru = hashPassword(passwordBaru);

  try {
    await jalankan(`update student_accounts set password_hash = $1 where id = $2`, [
      hashBaru,
      account.id,
    ]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menyimpan: ${pesan}`, sukses: false };
  }

  revalidatePath("/siswa");
  revalidatePath("/siswa/ganti-password");
  return { message: "Password berhasil diganti.", sukses: true };
}

// ============================================================================
// Submit jawaban ulangan bersoal (status "akan").
// ============================================================================

export type HasilSubmitUlangan = {
  message: string | null;
  nilaiTotal: number | null;
};

// ============================================================================
// Catat "probe": siswa meninggalkan halaman soal / pindah tab / minimize.
// ============================================================================

export async function catatProbe(formData: FormData) {
  const examId = String(formData.get("exam_id") ?? "");
  const jenis = String(formData.get("jenis") ?? "");

  if (!examId || !["blur", "visibility", "freeze"].includes(jenis)) {
    return;
  }

  const sesi = await ambilSesiSiswa();
  if (!sesi) return; // siswa tidak login → abaikan

  // Cek ulangan masih aktif (belum lewat tenggat, status "akan")
  const dUlangan = await satuBaris<{
    status: "akan" | "sudah";
    tenggat: Date | null;
  }>(`select status, tenggat from exams where id = $1`, [examId]);

  if (!dUlangan || dUlangan.status !== "akan") return;
  if (dUlangan.tenggat && new Date(dUlangan.tenggat).getTime() < Date.now()) {
    return; // tenggat sudah lewat, jangan catat lagi
  }

  // Cek apakah siswa sudah submit — probe setelah submit tidak relevan.
  const sudahSubmit = await satuBaris<{ id: string }>(
    `select id from exam_submissions
     where exam_id = $1 and siswa_id = $2
     limit 1`,
    [examId, sesi.siswaId],
  );

  if (sudahSubmit) return;

  // Insert probe — gagal diam-diam (tabel belum ada, dll).
  try {
    await jalankan(
      `insert into exam_probes (exam_id, siswa_id, jenis) values ($1, $2, $3)`,
      [examId, sesi.siswaId, jenis],
    );
  } catch {
    // abaikan
  }
}

export async function submitUlangan(
  _prevState: HasilSubmitUlangan,
  formData: FormData,
): Promise<HasilSubmitUlangan> {
  const examId = String(formData.get("exam_id") ?? "");

  if (!examId) {
    return { message: "Ulangan tidak ditemukan.", nilaiTotal: null };
  }

  const sesi = await ambilSesiSiswa();
  if (!sesi) {
    redirect("/login-siswa");
  }

  // Cek status + tenggat + durasi ulangan
  const dataUlangan = await satuBaris<{
    status: "akan" | "sudah";
    tenggat: Date | null;
    durasi: number | null;
    nilai_ditampilkan: boolean;
    nilai_selesai: boolean;
    dibuka: boolean | null;
  }>(
    `select status, tenggat, durasi, nilai_ditampilkan, nilai_selesai, dibuka
     from exams where id = $1`,
    [examId],
  );

  if (!dataUlangan) {
    return { message: "Ulangan tidak ditemukan.", nilaiTotal: null };
  }

  if (dataUlangan.status !== "akan") {
    return { message: "Ulangan ini bukan bersoal.", nilaiTotal: null };
  }

  if (dataUlangan.dibuka === false) {
    return {
      message: "Ulangan ini sedang ditutup oleh guru.",
      nilaiTotal: null,
    };
  }

  if (
    dataUlangan.tenggat &&
    new Date(dataUlangan.tenggat).getTime() < Date.now()
  ) {
    return {
      message: "Tenggat waktu sudah lewat. Tidak bisa submit lagi.",
      nilaiTotal: null,
    };
  }

  // Cek apakah sudah submit
  const submitLama = await satuBaris<{ id: string }>(
    `select id from exam_submissions
     where exam_id = $1 and siswa_id = $2
     limit 1`,
    [examId, sesi.siswaId],
  );

  if (submitLama) {
    return {
      message: "Kamu sudah submit jawaban untuk ulangan ini.",
      nilaiTotal: null,
    };
  }

  // Ambil soal + kunci
  const daftarSoal = await banyakBaris<SoalRow>(
    `select id, jenis, kunci, poin, pilihan
     from exam_questions
     where exam_id = $1
     order by urutan asc`,
    [examId],
  );

  if (daftarSoal.length === 0) {
    return { message: "Belum ada soal di ulangan ini.", nilaiTotal: null };
  }

  // Hitung nilai PG
  let nilaiPG = 0;
  const daftarJawaban: { soalId: string; jawaban: string }[] = [];

  for (const soal of daftarSoal) {
    const jawaban = String(formData.get(`jawaban_${soal.id}`) ?? "").trim();

    if (!jawaban) {
      daftarJawaban.push({ soalId: soal.id, jawaban: "" });
      continue;
    }

    daftarJawaban.push({ soalId: soal.id, jawaban });

    if (soal.jenis === "pg") {
      const jawabanHuruf = jawaban.toUpperCase().charAt(0);
      if (soal.kunci && jawabanHuruf === soal.kunci.toUpperCase()) {
        nilaiPG += soal.poin;
      }
    }
    // Esai: tidak dinilai otomatis (nilai_esai = 0, guru isi manual)
  }

  // Simpan submission
  const nilaiTotal = nilaiPG; // esai belum dinilai
  const submitBaru = await satuBaris<{ id: string }>(
    `insert into exam_submissions
       (exam_id, siswa_id, nilai_pg, nilai_esai, nilai_total)
     values ($1, $2, $3, 0, $4)
     returning id`,
    [examId, sesi.siswaId, nilaiPG, nilaiTotal],
  );

  if (!submitBaru) {
    return {
      message: "Gagal menyimpan jawaban: tidak diketahui",
      nilaiTotal: null,
    };
  }

  // Simpan jawaban detail
  for (const j of daftarJawaban) {
    try {
      await jalankan(
        `insert into exam_answers (submission_id, soal_id, jawaban)
         values ($1, $2, $3)`,
        [submitBaru.id, j.soalId, j.jawaban],
      );
    } catch (err) {
      const pesan = err instanceof Error ? err.message : "tidak diketahui";
      console.error("Gagal menyimpan detail jawaban:", pesan);
    }
  }

  // Sinkronkan nilai sementara ke exam_scores
  try {
    await jalankan(
      `insert into exam_scores (exam_id, siswa_id, nilai)
       values ($1, $2, $3)
       on conflict (exam_id, siswa_id)
       do update set nilai = excluded.nilai`,
      [examId, sesi.siswaId, nilaiTotal],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal sinkronkan exam_scores:", pesan);
  }

  revalidatePath("/siswa");
  revalidatePath("/siswa/nilai");
  revalidatePath(`/siswa/nilai/${examId}`);

  // Jika nilai ditahan oleh guru, jangan tampilkan angka ke siswa.
  const nilaiBolehTampil =
    dataUlangan.nilai_ditampilkan || dataUlangan.nilai_selesai;

  return {
    message: nilaiBolehTampil
      ? "Jawaban berhasil dikumpulkan!"
      : "Jawaban berhasil dikumpulkan. Nilai akan ditampilkan setelah guru selesai menilai.",
    nilaiTotal: nilaiBolehTampil ? nilaiTotal : null,
  };
}

// Soal butuh helper terpisah karena tipe kolom `pilihan` berupa array.
type SoalRow = {
  id: string;
  jenis: string;
  kunci: string | null;
  poin: number;
  pilihan: string[] | null;
};

// ============================================================================
// Verifikasi kode akses ulangan (kode diberikan guru).
// ============================================================================

export type HasilVerifikasiKode = { message: string | null };

export async function verifikasiKodeUlangan(
  _prevState: HasilVerifikasiKode,
  formData: FormData,
): Promise<HasilVerifikasiKode> {
  const examId = String(formData.get("exam_id") ?? "");
  const kode = String(formData.get("kode") ?? "").trim().toUpperCase();

  if (!examId || !kode) {
    return { message: "Kode akses wajib diisi." };
  }

  const sesi = await ambilSesiSiswa();
  if (!sesi) {
    redirect("/login-siswa");
  }

  const ulangan = await satuBaris<{ access_code: string | null }>(
    `select access_code from exams where id = $1`,
    [examId],
  );

  if (!ulangan) {
    return { message: "Ulangan tidak ditemukan." };
  }

  const kodeSimpan = (ulangan.access_code ?? "").trim().toUpperCase();

  if (!kodeSimpan) {
    return {
      message: "Ulangan ini belum punya kode akses. Tanyakan ke guru dulu.",
    };
  }

  if (kode !== kodeSimpan) {
    return { message: "Kode akses salah. Cek lagi dengan guru." };
  }

  redirect(`/siswa/nilai/${examId}?kode=1`);
}
