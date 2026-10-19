"use server";

import { revalidatePath } from "next/cache";
import { requireGuru } from "@/lib/require-guru";
import { bacaKelasDariForm } from "@/lib/pilih-kelas";
import { banyakBaris, jalankan } from "@/lib/db";
import { hapusBerkas, hapusFolder, folderTugas } from "@/lib/berkas";
import {
  bacaFileDiizinkan,
  bacaMetode,
  metodeMengizinkanFile,
} from "@/lib/tugas";

const MAX_JUDUL = 200;
const MAX_DESKRIPSI = 5000;
const MAX_UMPAN_BALIK = 2000;

export type HasilTugas = { message: string | null; berhasil: boolean };

// Membaca input datetime-local → ISO. Kosong = tanpa tenggat.
function parseTenggat(
  nilai: string,
): { ok: true; iso: string | null } | { ok: false } {
  const teks = nilai.trim();
  if (!teks) return { ok: true, iso: null };
  const waktu = new Date(teks);
  if (Number.isNaN(waktu.getTime())) return { ok: false };
  return { ok: true, iso: waktu.toISOString() };
}

// Simpan hubungan tugas-kelas (kosong = semua kelas). Pola sama
// seperti pengumuman/ulangan.
async function simpanKelasTugas(tugasId: string, daftarKelasId: string[]) {
  await jalankan(`delete from assignment_classes where tugas_id = $1`, [
    tugasId,
  ]);

  if (daftarKelasId.length === 0) return;

  await jalankan(
    `insert into assignment_classes (tugas_id, kelas_id)
     select $1, unnest($2::uuid[])
     on conflict do nothing`,
    [tugasId, daftarKelasId],
  );
}

function bacaIsian(formData: FormData) {
  const judul = String(formData.get("judul") ?? "").trim();
  const deskripsi = String(formData.get("deskripsi") ?? "").trim();
  const metode = bacaMetode(formData.get("metode"));
  const tenggat = parseTenggat(String(formData.get("tenggat") ?? ""));
  const daftarKelasId = bacaKelasDariForm(formData);
  const fileDiizinkan = metodeMengizinkanFile(metode)
    ? bacaFileDiizinkan(formData)
    : [];

  return {
    judul,
    deskripsi,
    metode,
    tenggat,
    daftarKelasId,
    fileDiizinkan,
  };
}

// Validasi bersama; kembalikan pesan error atau null.
function validasi(isian: ReturnType<typeof bacaIsian>): string | null {
  if (!isian.judul) return "Judul tugas wajib diisi.";
  if (isian.judul.length > MAX_JUDUL)
    return `Judul maksimal ${MAX_JUDUL} karakter.`;
  if (isian.deskripsi.length > MAX_DESKRIPSI)
    return `Deskripsi maksimal ${MAX_DESKRIPSI} karakter.`;
  if (!isian.tenggat.ok) return "Format tenggat waktu tidak valid.";
  return null;
}

export async function addTugas(
  _prevState: HasilTugas,
  formData: FormData,
): Promise<HasilTugas> {
  const isian = bacaIsian(formData);

  const galat = validasi(isian);
  if (galat) return { message: galat, berhasil: false };
  if (!isian.tenggat.ok) {
    return { message: "Format tenggat waktu tidak valid.", berhasil: false };
  }

  await requireGuru();

  let idBaru: string;
  try {
    const data = await banyakBaris<{ id: string }>(
      `insert into assignments (judul, deskripsi, metode, file_diizinkan, tenggat)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [
        isian.judul,
        isian.deskripsi,
        isian.metode,
        isian.fileDiizinkan.length > 0 ? isian.fileDiizinkan : null,
        isian.tenggat.iso,
      ],
    );
    idBaru = data[0].id;
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menambah tugas: ${pesan}`, berhasil: false };
  }

  try {
    await simpanKelasTugas(idBaru, isian.daftarKelasId);
  } catch (err) {
    await jalankan(`delete from assignments where id = $1`, [idBaru]).catch(
      () => {},
    );
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Tugas tersimpan, tapi gagal mengatur kelasnya (${pesan}).`,
      berhasil: false,
    };
  }

  revalidatePath("/guru/tugas");
  revalidatePath("/siswa/tugas");
  return { message: null, berhasil: true };
}

export async function updateTugas(
  _prevState: HasilTugas,
  formData: FormData,
): Promise<HasilTugas> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { message: "Data tugas tidak ditemukan.", berhasil: false };

  const isian = bacaIsian(formData);

  const galat = validasi(isian);
  if (galat) return { message: galat, berhasil: false };
  if (!isian.tenggat.ok) {
    return { message: "Format tenggat waktu tidak valid.", berhasil: false };
  }

  await requireGuru();

  let jumlahDiubah: number;
  try {
    jumlahDiubah = await jalankan(
      `update assignments
       set judul = $1,
           deskripsi = $2,
           metode = $3,
           file_diizinkan = $4,
           tenggat = $5,
           updated_at = now()
       where id = $6`,
      [
        isian.judul,
        isian.deskripsi,
        isian.metode,
        isian.fileDiizinkan.length > 0 ? isian.fileDiizinkan : null,
        isian.tenggat.iso,
        id,
      ],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal mengubah tugas: ${pesan}`, berhasil: false };
  }

  if (jumlahDiubah === 0) {
    return { message: "Data tugas tidak ditemukan.", berhasil: false };
  }

  try {
    await simpanKelasTugas(id, isian.daftarKelasId);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Perubahan tersimpan, tapi gagal mengatur kelasnya (${pesan}).`,
      berhasil: false,
    };
  }

  revalidatePath("/guru/tugas");
  revalidatePath(`/guru/tugas/${id}`);
  revalidatePath("/siswa/tugas");
  return { message: null, berhasil: true };
}

export async function deleteTugas(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await requireGuru();

  // Hapus berkas di disk milik tugas ini dulu (biar tidak jadi sampah).
  const berkas = await banyakBaris<{ path: string }>(
    `select f.path
     from assignment_files f
     join assignment_submissions s on s.id = f.submission_id
     where s.tugas_id = $1`,
    [id],
  ).catch(() => []);

  for (const b of berkas) await hapusBerkas(b.path);

  // Hapus folder tugas sekaligus (jaga-jaga ada berkas yang tidak tercatat).
  await hapusFolder(folderTugas(id));

  try {
    await jalankan(`delete from assignments where id = $1`, [id]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menghapus tugas:", pesan);
  }

  revalidatePath("/guru/tugas");
  revalidatePath("/siswa/tugas");
}

// Membalik status buka/tutup tugas. `dibuka=false` berarti guru menutup
// pengumpulan: siswa tidak bisa mengumpulkan atau memperbarui pengumpulannya
// (walau tenggat belum lewat). `dibuka=true` (default) = terbuka.
export async function toggleTugas(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await requireGuru();

  try {
    await jalankan(
      `update assignments
       set dibuka = not coalesce(dibuka, true), updated_at = now()
       where id = $1`,
      [id],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal membalik status tugas:", pesan);
  }

  revalidatePath("/guru/tugas");
  revalidatePath(`/guru/tugas/${id}`);
  revalidatePath("/siswa/tugas");
  revalidatePath(`/siswa/tugas/${id}`);
}

export async function nilaiTugas(
  _prevState: HasilTugas,
  formData: FormData,
): Promise<HasilTugas> {
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  const tugasId = String(formData.get("tugas_id") ?? "").trim();
  const nilaiRaw = String(formData.get("nilai") ?? "").trim();
  const umpanBalik = String(formData.get("umpan_balik") ?? "").trim();

  if (!submissionId) {
    return { message: "Pengumpulan tidak ditemukan.", berhasil: false };
  }

  if (umpanBalik.length > MAX_UMPAN_BALIK) {
    return {
      message: `Umpan balik maksimal ${MAX_UMPAN_BALIK} karakter.`,
      berhasil: false,
    };
  }

  let nilai: number | null = null;
  if (nilaiRaw) {
    const angka = Number(nilaiRaw);
    if (!Number.isFinite(angka) || angka < 0 || angka > 100) {
      return { message: "Nilai harus berupa angka 0–100.", berhasil: false };
    }
    nilai = Math.round(angka);
  }

  await requireGuru();

  try {
    const diubah = await jalankan(
      `update assignment_submissions
       set nilai = $2,
           umpan_balik = $3,
           dinilai_at = case when $2::numeric is null then null else now() end,
           updated_at = now()
       where id = $1`,
      [submissionId, nilai, umpanBalik || null],
    );

    if (diubah === 0) {
      return { message: "Pengumpulan tidak ditemukan.", berhasil: false };
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return { message: `Gagal menyimpan nilai: ${pesan}`, berhasil: false };
  }

  revalidatePath("/guru/tugas");
  if (tugasId) revalidatePath(`/guru/tugas/${tugasId}`);
  revalidatePath("/siswa/tugas");
  if (tugasId) revalidatePath(`/siswa/tugas/${tugasId}`);
  return { message: "Nilai tersimpan.", berhasil: true };
}
