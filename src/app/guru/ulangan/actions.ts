"use server";

import { revalidatePath } from "next/cache";
import { requireGuru } from "@/lib/require-guru";
import { bacaKelasDariForm } from "@/lib/pilih-kelas";
import { ambilKelasUlangan } from "@/lib/ambil-kelas-ulangan";
import { bacaNilaiDariForm, parseNilaiExcel } from "@/lib/parse-nilai";
import { banyakBaris, jalankan, placeholders, satuBaris } from "@/lib/db";

const MAX_JUDUL = 200;
const MAX_KODE = 50;

// Membaca daftar kelas dari form: pilihan di `PilihKelasMulti` dikirim
// sebagai input bernama "kelas[]" (bisa beberapa). [] = "semua kelas".

// Simpan hubungan kelas untuk satu ulangan. Kosong = hapus semua
// (berlaku untuk semua kelas), mirip pola pengumuman.
async function simpanKelasUlangan(ulanganId: string, daftarKelasId: string[]) {
  await jalankan(`delete from exam_classes where ulangan_id = $1`, [ulanganId]);

  if (daftarKelasId.length === 0) return;

  await jalankan(
    `insert into exam_classes (ulangan_id, kelas_id)
     select $1, unnest($2::uuid[])
     on conflict do nothing`,
    [ulanganId, daftarKelasId],
  );
}

export async function addUlangan(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const judul = String(formData.get("judul") ?? "").trim();
  const daftarKelasId = bacaKelasDariForm(formData);
  const tanggal = String(formData.get("tanggal") ?? "").trim();
  const accessCode = String(formData.get("access_code") ?? "").trim().toUpperCase();
  const status = String(formData.get("status") ?? "sudah").trim();
  const tenggat = String(formData.get("tenggat") ?? "").trim();
  const durasiRaw = String(formData.get("durasi") ?? "").trim();
  // nilai_ditampilkan: checkbox "tampilkan_nilai". Unchecked = false, checked = true.
  const nilaiDitampilkan = formData.get("tampilkan_nilai") !== null;

  if (!judul) {
    return { message: "Judul ulangan wajib diisi." };
  }

  if (judul.length > MAX_JUDUL) {
    return { message: `Judul maksimal ${MAX_JUDUL} karakter.` };
  }

  if (accessCode.length > MAX_KODE) {
    return { message: `Kode akses maksimal ${MAX_KODE} karakter.` };
  }

  const statusValid = status === "akan" ? "akan" : "sudah";
  // Tenggat hanya relevan untuk "akan"
  const tenggatValue =
    statusValid === "akan" && tenggat ? new Date(tenggat).toISOString() : null;

  // Durasi (menit) — validasi 0–9999
  let durasiValue: number | null = null;
  if (durasiRaw) {
    const parsed = Number(durasiRaw);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 9999) {
      return {
        message:
          "Durasi harus angka lebih dari 0 (dalam menit), maksimal 9999 menit.",
      };
    }
    durasiValue = Math.floor(parsed);
  }

  await requireGuru();

  let idBaru: string;
  try {
    const data = await banyakBaris<{ id: string }>(
      `insert into exams
         (judul, kelas_id, tanggal, access_code, status, tenggat, durasi, nilai_ditampilkan)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        judul,
        // Kolom lama tetap diisi kelas pertama (atau null) supaya data
        // lama yang dibaca dari exams.kelas_id masih bekerja.
        daftarKelasId.length === 1 ? daftarKelasId[0] : null,
        tanggal ? tanggal : null,
        accessCode ? accessCode : null,
        statusValid,
        tenggatValue,
        statusValid === "akan" ? durasiValue : null,
        statusValid === "akan" ? nilaiDitampilkan : true,
      ],
    );
    idBaru = data[0].id;
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menambah ulangan: ${pesan}` };
  }

  try {
    await simpanKelasUlangan(idBaru, daftarKelasId);
  } catch (err) {
    // Rollback sederhana: ulangan baru dihapus juga kalau hubungannya gagal
    await jalankan(`delete from exams where id = $1`, [idBaru]).catch(() => {});
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Ulangan tersimpan, tapi gagal mengatur kelasnya (${pesan}).`,
    };
  }

  revalidatePath("/guru/ulangan");
  return { message: null };
}

// Tandai ulangan "selesai dinilai" — nilai terbuka untuk semua siswa.
// Field: exam_id
export async function selesaiDinilai(formData: FormData) {
  const examId = String(formData.get("exam_id") ?? "");
  if (!examId) return;

  await requireGuru();

  try {
    await jalankan(`update exams set nilai_selesai = true where id = $1`, [
      examId,
    ]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menandai selesai dinilai:", pesan);
  }

  revalidatePath(`/guru/ulangan/${examId}/soal`);
  revalidatePath(`/siswa/nilai/${examId}`);
  revalidatePath("/siswa/nilai");
}

// Batalkan "selesai dinilai" (jika guru ingin menahan nilai lagi).
// Field: exam_id
export async function batalkanSelesaiDinilai(formData: FormData) {
  const examId = String(formData.get("exam_id") ?? "");
  if (!examId) return;

  await requireGuru();

  try {
    await jalankan(`update exams set nilai_selesai = false where id = $1`, [
      examId,
    ]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal membatalkan selesai dinilai:", pesan);
  }

  revalidatePath(`/guru/ulangan/${examId}/soal`);
  revalidatePath(`/siswa/nilai/${examId}`);
  revalidatePath("/siswa/nilai");
}

export async function updateUlangan(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const id = String(formData.get("id") ?? "");
  const judul = String(formData.get("judul") ?? "").trim();
  const daftarKelasId = bacaKelasDariForm(formData);
  const tanggal = String(formData.get("tanggal") ?? "").trim();
  const accessCode = String(formData.get("access_code") ?? "").trim().toUpperCase();
  const status = String(formData.get("status") ?? "sudah").trim();
  const tenggat = String(formData.get("tenggat") ?? "").trim();
  const durasiRaw = String(formData.get("durasi") ?? "").trim();
  const nilaiDitampilkan = formData.get("tampilkan_nilai") !== null;

  if (!id) {
    return { message: "Data ulangan tidak ditemukan." };
  }

  if (!judul) {
    return { message: "Judul ulangan wajib diisi." };
  }

  if (judul.length > MAX_JUDUL) {
    return { message: `Judul maksimal ${MAX_JUDUL} karakter.` };
  }

  if (accessCode.length > MAX_KODE) {
    return { message: `Kode akses maksimal ${MAX_KODE} karakter.` };
  }

  const statusValid = status === "akan" ? "akan" : "sudah";
  const tenggatValue =
    statusValid === "akan" && tenggat ? new Date(tenggat).toISOString() : null;

  let durasiValue: number | null = null;
  if (durasiRaw) {
    const parsed = Number(durasiRaw);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 9999) {
      return {
        message:
          "Durasi harus angka lebih dari 0 (dalam menit), maksimal 9999 menit.",
      };
    }
    durasiValue = Math.floor(parsed);
  }

  await requireGuru();

  let jumlahDiubah: number;
  try {
    jumlahDiubah = await jalankan(
      `update exams
       set judul = $1,
           kelas_id = $2,
           tanggal = $3,
           access_code = $4,
           status = $5,
           tenggat = $6,
           durasi = $7,
           nilai_ditampilkan = $8
       where id = $9`,
      [
        judul,
        // Kolom lama tetap diisi kelas pertama (atau null) untuk
        // kompatibilitas pembacaan data lama.
        daftarKelasId.length === 1 ? daftarKelasId[0] : null,
        tanggal ? tanggal : null,
        accessCode ? accessCode : null,
        statusValid,
        tenggatValue,
        statusValid === "akan" ? durasiValue : null,
        statusValid === "akan" ? nilaiDitampilkan : true,
        id,
      ],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal mengubah ulangan: ${pesan}` };
  }

  if (jumlahDiubah === 0) {
    return { message: "Data ulangan tidak ditemukan." };
  }

  try {
    await simpanKelasUlangan(id, daftarKelasId);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Judul dan data ulangan sudah tersimpan, tapi gagal mengatur kelasnya (${pesan}).`,
    };
  }

  revalidatePath("/guru/ulangan");
  return { message: null };
}

export async function deleteUlangan(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await requireGuru();

  try {
    await jalankan(`delete from exams where id = $1`, [id]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menghapus ulangan:", pesan);
  }

  revalidatePath("/guru/ulangan");
}

// Membalik status buka/tutup ulangan. `dibuka=false` berarti ulangan
// ditutup oleh guru: siswa tidak bisa mengerjakan soal (status "akan")
// atau melihat detail nilai. `dibuka=true` (default) = terbuka.
export async function toggleUlangan(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await requireGuru();

  // Balikkan nilai di database: null dianggap "dibuka".
  try {
    await jalankan(
      `update exams set dibuka = not coalesce(dibuka, true) where id = $1`,
      [id],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal membalik status ulangan:", pesan);
  }

  revalidatePath("/guru/ulangan");
  revalidatePath(`/guru/ulangan/${id}/soal`);
  revalidatePath(`/siswa/nilai/${id}`);
  revalidatePath("/siswa/nilai");
  revalidatePath("/siswa");
}

// Menyimpan nilai semua siswa sekaligus untuk satu ulangan.
// Input form bernama `nilai_{siswaId}`. Siswa yang inputnya kosong
// dianggap belum dinilai — baris lamanya dihapus kalau tadinya ada.
export async function simpanNilaiBatch(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const examId = String(formData.get("exam_id") ?? "");

  if (!examId) {
    return { message: "Ulangan tidak ditemukan." };
  }

  const { daftar, galat } = bacaNilaiDariForm(formData);

  if (galat) {
    return { message: galat };
  }

  await requireGuru();

  try {
    // 1) Hapus semua nilai lama ulangan ini (nilai yang dikosongkan
    //    di form berarti "belum dinilai" lagi).
    await jalankan(`delete from exam_scores where exam_id = $1`, [examId]);

    // 2) Sisipkan nilai yang terisi.
    if (daftar.length > 0) {
      await jalankan(
        `insert into exam_scores (exam_id, siswa_id, nilai)
         select $1, d.siswa_id, d.nilai
         from unnest($2::uuid[], $3::numeric[]) as d(siswa_id, nilai)`,
        [examId, daftar.map((d) => d.siswaId), daftar.map((d) => d.nilai)],
      );
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menyimpan nilai: ${pesan}` };
  }

  revalidatePath("/guru/ulangan");
  revalidatePath(`/guru/ulangan/${examId}/nilai`);
  return { message: null };
}

// ======================================================================
// Import nilai dari Excel (isi form, belum disimpan ke DB)
// ======================================================================

// Satu baris pratinjau hasil import.
export type BarisPratinjauNilai = {
  // NIS dari file
  nis: string;
  // Nama dari file (untuk verifikasi visual)
  namaFile: string;
  // Nilai dari file
  nilai: number;
  // status: "ok" = NIS terdaftar & nilai valid, "salah" = ada masalah
  status: "ok" | "salah";
  // Alasan kalau status salah (misal NIS tidak terdaftar)
  alasan: string | null;
  // SiswaId DB kalau ok (untuk mengisi form)
  siswaId: string | null;
};

export type HasilImportNilaiExcel = {
  message: string | null;
  // Baris pratinjau (semua baris dari file, status per baris)
  daftar: BarisPratinjauNilai[];
  // Petakan nilai OK saja: siswaId → nilai (untuk mengisi form saat simpan)
  nilaiOk: Map<string, number> | null;
};

export async function importNilaiExcel(
  _prevState: HasilImportNilaiExcel,
  formData: FormData,
): Promise<HasilImportNilaiExcel> {
  const examId = String(formData.get("exam_id") ?? "");

  if (!examId) {
    return { message: "Ulangan tidak ditemukan.", daftar: [], nilaiOk: null };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { message: "Pilih file Excel (.xlsx) dulu.", daftar: [], nilaiOk: null };
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      message: "File harus format .xlsx. Unduh template dan isi nilainya.",
      daftar: [],
      nilaiOk: null,
    };
  }

  await requireGuru();

  // 1) Ambil ulangan + kelasnya (gabungan: kolom lama + relasi baru)
  let ulangan: { id: string; kelas_id: string | null };
  try {
    const baris = await satuBaris<{ id: string; kelas_id: string | null }>(
      `select id, kelas_id from exams where id = $1`,
      [examId],
    );
    if (!baris) {
      return { message: "Ulangan tidak ditemukan.", daftar: [], nilaiOk: null };
    }
    ulangan = baris;
  } catch {
    return { message: "Ulangan tidak ditemukan.", daftar: [], nilaiOk: null };
  }

  let hubungan: { kelas_id: string }[];
  try {
    hubungan = await banyakBaris<{ kelas_id: string }>(
      `select kelas_id from exam_classes where ulangan_id = $1`,
      [examId],
    );
  } catch {
    hubungan = [];
  }

  const daftarKelasId = ambilKelasUlangan({
    kelas_id: ulangan.kelas_id,
    exam_classes: hubungan,
  });
  if (daftarKelasId.length === 0) {
    return {
      message:
        "Ulangan ini berlaku untuk semua kelas, jadi import per kelas tidak bisa memastikan NIS terdaftar. Import langsung dari halaman input nilai.",
      daftar: [],
      nilaiOk: null,
    };
  }

  // 2) Ambil daftar siswa kelas (NIS + id) untuk matching
  let siswaData: { id: string; nis: string | null }[];
  try {
    siswaData = await banyakBaris<{ id: string; nis: string | null }>(
      `select id, nis from students
       where kelas_id in (${placeholders(daftarKelasId.length)})`,
      daftarKelasId,
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Gagal memuat daftar siswa kelas: ${pesan}`,
      daftar: [],
      nilaiOk: null,
    };
  }

  // Map: NIS → siswaId. NIS kosong/missing di siswa diabaikan.
  const mapNISKeSiswaId = new Map<string, string>();
  for (const siswa of siswaData) {
    const nis = siswa.nis?.trim();
    if (nis) mapNISKeSiswaId.set(nis, siswa.id);
  }

  // 3) Baca file Excel
  const buffer = Buffer.from(await file.arrayBuffer());
  const hasilParse = await parseNilaiExcel(buffer);

  if (hasilParse.galat) {
    return { message: hasilParse.galat, daftar: [], nilaiOk: null };
  }

  // 4) Tandai baris: NIS terdaftar di kelas? Hasilkan pratinjau per baris.
  const daftar: BarisPratinjauNilai[] = [];
  const nilaiOk = new Map<string, number>();

  for (const baris of hasilParse.daftar) {
    if (baris.status === "salah") {
      daftar.push({
        nis: baris.nis,
        namaFile: baris.nama,
        nilai: baris.nilai,
        status: "salah",
        alasan: baris.alasan,
        siswaId: null,
      });
      continue;
    }

    const siswaId = mapNISKeSiswaId.get(baris.nis) ?? null;

    if (!siswaId) {
      daftar.push({
        nis: baris.nis,
        namaFile: baris.nama,
        nilai: baris.nilai,
        status: "salah",
        alasan: "NIS tidak terdaftar di kelas ini",
        siswaId: null,
      });
      continue;
    }

    daftar.push({
      nis: baris.nis,
      namaFile: baris.nama,
      nilai: baris.nilai,
      status: "ok",
      alasan: null,
      siswaId,
    });
    nilaiOk.set(siswaId, baris.nilai);
  }

  // Pesan ringkas: berapa baris ok, berapa salah
  const jumlahOk = daftar.filter((b) => b.status === "ok").length;
  const jumlahSalah = daftar.length - jumlahOk;

  let message: string | null = null;
  if (jumlahOk === 0) {
    message =
      "Tidak ada baris valid di file. Perbaiki NIS / nilai lalu import ulang.";
  } else if (jumlahSalah > 0) {
    message = `${jumlahOk} baris valid, ${jumlahSalah} baris bermasalah (lihat pratinjau).`;
  }

  return {
    message,
    daftar,
    nilaiOk: daftar.some((b) => b.status === "ok") ? nilaiOk : null,
  };
}

// ======================================================================
// CRUD Soal Ulangan
// ======================================================================

const MAX_SOAL = 5000;

export async function addQuestion(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const examId = String(formData.get("exam_id") ?? "");
  const soal = String(formData.get("soal") ?? "").trim();
  const jenis = String(formData.get("jenis") ?? "").trim();
  const poin = Number(formData.get("poin") ?? 0);
  const urutan = Number(formData.get("urutan") ?? 0);

  // Pilihan PG: baca input bernama `pilihan_0`, `pilihan_1`, dst.
  const pilihanA = String(formData.get("pilihan_0") ?? "").trim();
  const pilihanB = String(formData.get("pilihan_1") ?? "").trim();
  const pilihanC = String(formData.get("pilihan_2") ?? "").trim();
  const pilihanD = String(formData.get("pilihan_3") ?? "").trim();
  const kunci = String(formData.get("kunci") ?? "").trim().toUpperCase();

  if (!examId) {
    return { message: "Ulangan tidak ditemukan." };
  }

  if (!soal) {
    return { message: "Soal wajib diisi." };
  }

  if (soal.length > MAX_SOAL) {
    return { message: `Soal maksimal ${MAX_SOAL} karakter.` };
  }

  if (jenis !== "pg" && jenis !== "esai") {
    return { message: "Jenis soal tidak valid." };
  }

  if (poin < 0 || poin > 1000) {
    return { message: "Poin harus antara 0 dan 1000." };
  }

  await requireGuru();

  // Untuk PG: simpan pilihan non-kosong saja
  let daftarPilihan: string[] | null = null;
  let kunciSimpan: string | null = null;

  if (jenis === "pg") {
    const opsiRaw = [pilihanA, pilihanB, pilihanC, pilihanD];
    // Tandai opsi yang non-kosong
    const opsiTerisi = opsiRaw
      .map((opsi, i) => ({ opsi, label: String.fromCharCode(65 + i) }))
      .filter(({ opsi }) => opsi);

    if (opsiTerisi.length < 2) {
      return { message: "Pilihan ganda minimal 2 opsi terisi." };
    }

    // Kunci harus sesuai salah satu label opsi yang terisi
    if (!opsiTerisi.some(({ label }) => label === kunci)) {
      return {
        message: `Kunci harus salah satu dari opsi yang terisi (${opsiTerisi
          .map(({ label }) => label)
          .join(", ")}).`,
      };
    }

    daftarPilihan = opsiTerisi.map(({ opsi, label }) => `${label}. ${opsi}`);
    kunciSimpan = kunci;
  }

  try {
    await jalankan(
      `insert into exam_questions
         (exam_id, soal, jenis, pilihan, kunci, poin, urutan)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [examId, soal, jenis, daftarPilihan, kunciSimpan, poin, urutan],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menambah soal: ${pesan}` };
  }

  revalidatePath(`/guru/ulangan/${examId}/soal`);
  return { message: null };
}

export async function deleteQuestion(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const examId = String(formData.get("exam_id") ?? "");
  if (!id) return;

  await requireGuru();

  try {
    await jalankan(`delete from exam_questions where id = $1`, [id]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menghapus soal:", pesan);
  }

  revalidatePath(`/guru/ulangan/${examId}/soal`);
}

// Simpan penilaian esai: nilai esai per soal (field `nilai_esai_{soalId}`),
// update nilai_esai (total) + nilai_total di exam_submissions, dan
// simpan nilai per soal di tabel `exam_essay_scores`.
// Kalau tabel itu belum ada, gagal simpan per soal ditangani diam-diam —
// nilai total tetap tersinkron ke exam_scores.
export async function simpanNilaiEsai(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const examId = String(formData.get("exam_id") ?? "");
  const siswaId = String(formData.get("siswa_id") ?? "");

  if (!examId || !siswaId) {
    return { message: "Data tidak lengkap." };
  }

  // Kumpulkan semua input nilai esai per soal: `nilai_esai_{soalId}`.
  const daftarNilaiEsai: { soalId: string; nilai: number }[] = [];
  let totalEsai = 0;

  for (const [nama, nilaiRaw] of formData.entries()) {
    if (!nama.startsWith("nilai_esai_")) continue;
    const soalId = nama.replace("nilai_esai_", "");
    const nilai = Number(nilaiRaw ?? 0);
    const nilaiValid = Number.isFinite(nilai)
      ? Math.max(0, Math.min(100, Math.floor(nilai)))
      : 0;
    daftarNilaiEsai.push({ soalId, nilai: nilaiValid });
    totalEsai += nilaiValid;
  }

  await requireGuru();

  // Ambil nilai PG dari submit
  let submit: { nilai_pg: number | null } | null;
  try {
    submit = await satuBaris<{ nilai_pg: number | null }>(
      `select nilai_pg from exam_submissions
       where exam_id = $1 and siswa_id = $2`,
      [examId, siswaId],
    );
  } catch {
    submit = null;
  }

  if (!submit) {
    return { message: "Submit siswa ini tidak ditemukan." };
  }

  const nilaiPG = Number(submit.nilai_pg ?? 0);
  const nilaiTotal = nilaiPG + totalEsai;

  // Update exam_submissions
  try {
    await jalankan(
      `update exam_submissions set nilai_esai = $3, nilai_total = $4
       where exam_id = $1 and siswa_id = $2`,
      [examId, siswaId, totalEsai, nilaiTotal],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menyimpan penilaian esai: ${pesan}` };
  }

  // Simpan nilai esai per soal (hapus lama, insert baru). Gagal diam-diam
  // kalau tabel `exam_essay_scores` belum ada.
  if (daftarNilaiEsai.length > 0) {
    try {
      await jalankan(
        `delete from exam_essay_scores where exam_id = $1 and siswa_id = $2`,
        [examId, siswaId],
      );
      await jalankan(
        `insert into exam_essay_scores (exam_id, siswa_id, soal_id, nilai)
         select $1, $2, d.soal_id, d.nilai
         from unnest($3::uuid[], $4::int[]) as d(soal_id, nilai)`,
        [
          examId,
          siswaId,
          daftarNilaiEsai.map((n) => n.soalId),
          daftarNilaiEsai.map((n) => n.nilai),
        ],
      );
    } catch (err) {
      const pesan = err instanceof Error ? err.message : "tidak diketahui";
      console.error("Gagal menyimpan nilai esai per soal:", pesan);
    }
  }

  // Sinkronkan ke exam_scores
  try {
    await jalankan(
      `insert into exam_scores (exam_id, siswa_id, nilai)
       values ($1, $2, $3)
       on conflict (exam_id, siswa_id)
       do update set nilai = excluded.nilai`,
      [examId, siswaId, nilaiTotal],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal sinkronkan exam_scores:", pesan);
  }

  revalidatePath(`/guru/ulangan/${examId}/soal`);
  revalidatePath(`/guru/ulangan/${examId}/nilai`);
  revalidatePath("/guru/ulangan");
  return { message: null };
}
