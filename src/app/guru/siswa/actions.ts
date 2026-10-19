"use server";

import { revalidatePath } from "next/cache";
import { jalankan, banyakBaris, placeholders } from "@/lib/db";
import { requireGuru } from "@/lib/require-guru";

const MAX_NIS = 50;
const MAX_NAMA = 200;

function bacaForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nis = String(formData.get("nis") ?? "").trim();
  const namaSiswa = String(formData.get("nama_siswa") ?? "").trim();
  const kelasId = String(formData.get("kelas_id") ?? "").trim();

  return { id, nis, namaSiswa, kelasId: kelasId ? kelasId : null };
}

// Kode error PostgreSQL untuk unique violation.
function pesanGagal(err: unknown, aksi: string): string {
  const e = err as { code?: string; message?: string };
  if (e?.code === "23505") {
    return "NIS sudah dipakai siswa lain.";
  }
  return `Gagal ${aksi} siswa: ${e?.message ?? "tidak diketahui"}`;
}

export async function addSiswa(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const { nis, namaSiswa, kelasId } = bacaForm(formData);

  if (!nis) {
    return { message: "NIS wajib diisi." };
  }

  if (nis.length > MAX_NIS) {
    return { message: `NIS maksimal ${MAX_NIS} karakter.` };
  }

  if (!namaSiswa) {
    return { message: "Nama siswa wajib diisi." };
  }

  if (namaSiswa.length > MAX_NAMA) {
    return { message: `Nama siswa maksimal ${MAX_NAMA} karakter.` };
  }

  await requireGuru();

  try {
    await jalankan(
      `insert into students (nis, nama_siswa, kelas_id) values ($1, $2, $3)`,
      [nis, namaSiswa, kelasId],
    );
  } catch (err) {
    return { message: pesanGagal(err, "menambah") };
  }

  revalidatePath("/guru/siswa");
  return { message: null };
}

export async function updateSiswa(
  _prevState: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const { id, nis, namaSiswa, kelasId } = bacaForm(formData);

  if (!id) {
    return { message: "Data siswa tidak ditemukan." };
  }

  if (!nis) {
    return { message: "NIS wajib diisi." };
  }

  if (nis.length > MAX_NIS) {
    return { message: `NIS maksimal ${MAX_NIS} karakter.` };
  }

  if (!namaSiswa) {
    return { message: "Nama siswa wajib diisi." };
  }

  if (namaSiswa.length > MAX_NAMA) {
    return { message: `Nama siswa maksimal ${MAX_NAMA} karakter.` };
  }

  await requireGuru();

  try {
    const terpengaruh = await jalankan(
      `update students
       set nis = $1, nama_siswa = $2, kelas_id = $3
       where id = $4`,
      [nis, namaSiswa, kelasId, id],
    );

    if (terpengaruh === 0) {
      return { message: "Siswa tidak ditemukan." };
    }
  } catch (err) {
    return { message: pesanGagal(err, "mengubah") };
  }

  revalidatePath("/guru/siswa");
  return { message: null };
}

export async function deleteSiswa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await requireGuru();

  try {
    await jalankan(`delete from students where id = $1`, [id]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    console.error("Gagal menghapus siswa:", pesan);
  }

  revalidatePath("/guru/siswa");
}

// ============================================================================
// Aksi massal untuk siswa terpilih (dari checkbox di halaman Data Siswa).
// Field: `ids` (boleh banyak), `aksi` = salah satu:
//   aktifkan | nonaktifkan | hapus-akun | hapus-siswa
// ============================================================================

export type HasilAksiSiswaBanyak = {
  message: string | null;
  sukses: boolean;
  info: string | null;
};

export async function aksiSiswaBanyak(
  _prevState: HasilAksiSiswaBanyak,
  formData: FormData,
): Promise<HasilAksiSiswaBanyak> {
  const aksi = String(formData.get("aksi") ?? "");
  const ids = formData
    .getAll("ids")
    .map((nilai) => String(nilai))
    .filter(Boolean);

  if (ids.length === 0) {
    return { message: "Tidak ada siswa yang dipilih.", sukses: false, info: null };
  }

  await requireGuru();

  const daftar = placeholders(ids.length);

  if (aksi === "aktifkan" || aksi === "nonaktifkan") {
    const aktif = aksi === "aktifkan";
    try {
      const jumlah = await jalankan(
        `update student_accounts set is_active = $1
         where siswa_id in (${daftar})`,
        [aktif, ...ids],
      );

      revalidatePath("/guru/siswa");
      return {
        message: null,
        sukses: true,
        info: `${jumlah} akun ${aktif ? "diaktifkan" : "dinonaktifkan"}.`,
      };
    } catch (err) {
      const pesan = err instanceof Error ? err.message : "tidak diketahui";
      return {
        message: `Gagal mengubah status akun: ${pesan}`,
        sukses: false,
        info: null,
      };
    }
  }

  if (aksi === "hapus-akun") {
    try {
      const jumlah = await jalankan(
        `delete from student_accounts where siswa_id in (${daftar})`,
        ids,
      );

      revalidatePath("/guru/siswa");
      return {
        message: null,
        sukses: true,
        info: `${jumlah} akun login dihapus (siswa tetap ada).`,
      };
    } catch (err) {
      const pesan = err instanceof Error ? err.message : "tidak diketahui";
      return {
        message: `Gagal menghapus akun: ${pesan}`,
        sukses: false,
        info: null,
      };
    }
  }

  if (aksi === "hapus-siswa") {
    try {
      const jumlah = await jalankan(
        `delete from students where id in (${daftar})`,
        ids,
      );

      revalidatePath("/guru/siswa");
      revalidatePath("/guru");
      return {
        message: null,
        sukses: true,
        info: `${jumlah} siswa dihapus.`,
      };
    } catch (err) {
      const pesan = err instanceof Error ? err.message : "tidak diketahui";
      return {
        message: `Gagal menghapus siswa: ${pesan}`,
        sukses: false,
        info: null,
      };
    }
  }

  return { message: "Aksi tidak dikenal.", sukses: false, info: null };
}

// ============================================================================
// Pindah kelas siswa (satu atau banyak sekaligus).
// Field: `ids` (boleh banyak), `kelas_id` (kelas tujuan; kosong = tanpa kelas)
//
// Catatan:
//  - Data tugas/ulangan/lab/nilai menempel ke siswa_id, jadi tidak terpengaruh.
//  - Absensi menyimpan kelas_id sendiri → ikut dipindah ke kelas tujuan.
//  - Constraint unik (siswa_id, tanggal) bisa bentrok kalau siswa punya
//    absensi di kelas tujuan pada tanggal yang sama; baris kelas tujuan
//    dipertahankan dan jumlah bentrokan dilaporkan sebagai info.
// ============================================================================

export type HasilPindahKelas = {
  message: string | null;
  sukses: boolean;
  info: string | null;
};

export async function pindahKelasSiswa(
  _prevState: HasilPindahKelas,
  formData: FormData,
): Promise<HasilPindahKelas> {
  const ids = Array.from(
    new Set(
      formData
        .getAll("ids")
        .map((nilai) => String(nilai))
        .filter(Boolean),
    ),
  );
  const kelasIdTujuan = String(formData.get("kelas_id") ?? "").trim() || null;

  if (ids.length === 0) {
    return { message: "Tidak ada siswa yang dipilih.", sukses: false, info: null };
  }

  await requireGuru();

  // Kalau tujuan bukan "tanpa kelas", pastikan kelasnya memang ada.
  if (kelasIdTujuan) {
    const kelas = await banyakBaris<{ id: string }>(
      `select id from classes where id = $1`,
      [kelasIdTujuan],
    );

    if (kelas.length === 0) {
      return { message: "Kelas tujuan tidak ditemukan.", sukses: false, info: null };
    }
  }

  const daftar = placeholders(ids.length);

  // Cari siswa yang kelasnya benar-benar berubah.
  let siswaBerubah: { id: string; nama_siswa: string; kelas_id: string | null }[];

  try {
    siswaBerubah = kelasIdTujuan
      ? await banyakBaris(
          `select id, nama_siswa, kelas_id from students
           where id in (${daftar})
             and (kelas_id is null or kelas_id <> $${ids.length + 1})`,
          [...ids, kelasIdTujuan],
        )
      : await banyakBaris(
          `select id, nama_siswa, kelas_id from students
           where id in (${daftar}) and kelas_id is not null`,
          ids,
        );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Gagal memuat siswa: ${pesan}`,
      sukses: false,
      info: null,
    };
  }

  if (siswaBerubah.length === 0) {
    return {
      message: null,
      sukses: true,
      info: "Semua siswa terpilih sudah berada di kelas tujuan.",
    };
  }

  const idBerubah = siswaBerubah.map((siswa) => siswa.id);
  const daftarBerubah = placeholders(idBerubah.length);

  try {
    await jalankan(
      `update students set kelas_id = $1 where id in (${daftarBerubah})`,
      [kelasIdTujuan, ...idBerubah],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      message: `Gagal memindahkan siswa: ${pesan}`,
      sukses: false,
      info: null,
    };
  }

  // Absensi ikut pindah. Tanpa kelas tujuan, absensi tetap di kelas asalnya
  // karena attendance.kelas_id wajib terisi.
  let bentrok = 0;
  if (kelasIdTujuan) {
    for (const siswaId of idBerubah) {
      try {
        await jalankan(
          `update attendance set kelas_id = $1 where siswa_id = $2`,
          [kelasIdTujuan, siswaId],
        );
      } catch (err) {
        // Kode 23505 = ada absensi di kelas tujuan pada tanggal yang sama.
        const e = err as { code?: string; message?: string };
        if (e?.code === "23505") {
          bentrok += 1;
          continue;
        }
        console.error(
          `Gagal memindahkan absensi siswa ${siswaId}:`,
          e?.message ?? "tidak diketahui",
        );
      }
    }
  }

  revalidatePath("/guru/siswa");
  revalidatePath("/guru/absensi");
  revalidatePath("/guru/rekap");
  revalidatePath("/siswa", "layout");

  const ringkas = `${siswaBerubah.length} siswa dipindahkan.`;
  return {
    message: null,
    sukses: true,
    info:
      bentrok > 0
        ? `${ringkas} Absensi lama ${bentrok} siswa tidak ikut pindah karena sudah ada catatan di kelas tujuan pada tanggal yang sama.`
        : ringkas,
  };
}
