"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ambilSesiSiswa } from "@/lib/sesi-siswa";
import { banyakBaris, jalankan, satuBaris } from "@/lib/db";
import {
  hapusBerkas,
  namaBerkasBaru,
  simpanBerkas,
} from "@/lib/berkas";
import {
  MAKS_FILE,
  MAKS_FILE_MB,
  ambilKelasTugas,
  bacaMetode,
  bersihkanNamaFile,
  daftarEkstensiDiizinkan,
  fileDiizinkan,
  metodeMengizinkanFile,
  metodeMengizinkanLink,
  normalisasiTautan,
  tipeDariNama,
} from "@/lib/tugas";

export type HasilKumpulTugas = { message: string | null; berhasil: boolean };

// Ambil File dari FormData; buang string kosong / berkas 0 byte.
function sebagaiFile(nilai: FormDataEntryValue): File | null {
  if (typeof nilai === "string") return null;
  const berkas = nilai as File;
  if (typeof berkas.arrayBuffer !== "function") return null;
  if (!berkas.size) return null;
  return berkas;
}

export async function kumpulkanTugas(
  _prevState: HasilKumpulTugas,
  formData: FormData,
): Promise<HasilKumpulTugas> {
  const tugasId = String(formData.get("tugas_id") ?? "").trim();
  if (!tugasId) {
    return { message: "Tugas tidak ditemukan.", berhasil: false };
  }

  const sesi = await ambilSesiSiswa();
  if (!sesi) redirect("/login-siswa");

  const tugas = await satuBaris<{
    id: string;
    metode: string | null;
    file_diizinkan: string[] | null;
    tenggat: string | null;
    dibuka: boolean | null;
  }>(
    `select id, metode, file_diizinkan, tenggat, dibuka
     from assignments where id = $1`,
    [tugasId],
  );

  if (!tugas) {
    return { message: "Tugas tidak ditemukan.", berhasil: false };
  }

  const metode = bacaMetode(tugas.metode);

  // Tugas ditutup guru? Tolak walau tenggat belum lewat.
  if (tugas.dibuka === false) {
    return { message: "Tugas ini sudah ditutup oleh guru.", berhasil: false };
  }

  // Tenggat sudah lewat?
  if (tugas.tenggat && new Date(tugas.tenggat).getTime() < Date.now()) {
    return {
      message: "Tenggat sudah lewat. Hubungi gurumu kalau ada masalah.",
      berhasil: false,
    };
  }

  // Cek relevansi kelas.
  const siswa = await satuBaris<{ id: string; kelas_id: string | null }>(
    `select id, kelas_id from students where id = $1`,
    [sesi.siswaId],
  );

  if (!siswa) {
    return { message: "Data siswa tidak ditemukan.", berhasil: false };
  }

  const hubungan = await banyakBaris<{ kelas_id: string }>(
    `select kelas_id from assignment_classes where tugas_id = $1`,
    [tugasId],
  );

  const daftarKelasId = ambilKelasTugas({ assignment_classes: hubungan });
  const relevan =
    daftarKelasId.length === 0 ||
    (siswa.kelas_id !== null && daftarKelasId.includes(siswa.kelas_id));

  if (!relevan) {
    return { message: "Tugas ini bukan untuk kelasmu.", berhasil: false };
  }

  // Baca isian.
  const tautanRaw = String(formData.get("tautan") ?? "");
  const catatan = String(formData.get("catatan") ?? "").trim();
  const tautan = metodeMengizinkanLink(metode)
    ? normalisasiTautan(tautanRaw)
    : null;

  const berkas = [
    ...formData.getAll("foto").map(sebagaiFile),
    ...formData.getAll("dokumen").map(sebagaiFile),
  ].filter((f): f is File => f !== null);

  // Validasi sesuai metode.
  if (metodeMengizinkanLink(metode) && !tautan) {
    return { message: "Tautan wajib diisi.", berhasil: false };
  }
  if (metodeMengizinkanFile(metode) && berkas.length === 0) {
    return {
      message: "Minimal satu berkas harus diunggah.",
      berhasil: false,
    };
  }
  if (!tautan && berkas.length === 0) {
    return { message: "Isi tautan atau unggah berkas dulu.", berhasil: false };
  }

  if (berkas.length > MAKS_FILE) {
    return { message: `Maksimal ${MAKS_FILE} berkas.`, berhasil: false };
  }

  const daftarEkstensi = daftarEkstensiDiizinkan(tugas.file_diizinkan);
  for (const file of berkas) {
    if (!fileDiizinkan(file.name, daftarEkstensi)) {
      return {
        message: `Jenis berkas "${file.name}" tidak diizinkan.`,
        berhasil: false,
      };
    }
    if (file.size > MAKS_FILE_MB * 1024 * 1024) {
      return {
        message: `Berkas "${file.name}" melebihi ${MAKS_FILE_MB} MB.`,
        berhasil: false,
      };
    }
  }

  // Simpan / perbarui pengumpulan.
  const submission = await satuBaris<{ id: string }>(
    `insert into assignment_submissions (tugas_id, siswa_id, tautan, catatan, updated_at)
     values ($1, $2, $3, $4, now())
     on conflict (tugas_id, siswa_id)
     do update set tautan = excluded.tautan,
                   catatan = excluded.catatan,
                   updated_at = now()
     returning id`,
    [tugasId, sesi.siswaId, tautan, catatan || null],
  );

  if (!submission) {
    return {
      message: "Gagal menyimpan pengumpulan: tidak diketahui",
      berhasil: false,
    };
  }

  // Ganti berkas lama dengan yang baru (hanya kalau metode mengizinkan file).
  // Kalau metode "link saja", berkas lama dibiarkan.
  if (metodeMengizinkanFile(metode)) {
    const berkasLama = await banyakBaris<{ path: string }>(
      `select path from assignment_files where submission_id = $1`,
      [submission.id],
    );

    if (berkasLama.length > 0) {
      for (const b of berkasLama) await hapusBerkas(b.path);
      await jalankan(`delete from assignment_files where submission_id = $1`, [
        submission.id,
      ]);
    }

    const berhasilDitulis: string[] = [];
    const barisBerkas: {
      submission_id: string;
      tipe: string;
      nama_file: string;
      path: string;
      ukuran: number;
    }[] = [];

    for (const file of berkas) {
      const path = [
        "tugas",
        tugasId,
        submission.id,
        namaBerkasBaru(file.name, bersihkanNamaFile(file.name)),
      ].join("/");

      try {
        const isi = Buffer.from(await file.arrayBuffer());
        await simpanBerkas(path, isi);
        berhasilDitulis.push(path);
      } catch (err) {
        // Buang berkas yang sudah terlanjur ditulis di percobaan ini.
        for (const p of berhasilDitulis) await hapusBerkas(p);
        const pesan = err instanceof Error ? err.message : "tidak diketahui";
        return {
          message: `Gagal mengunggah "${file.name}": ${pesan}.`,
          berhasil: false,
        };
      }

      barisBerkas.push({
        submission_id: submission.id,
        tipe: tipeDariNama(file.name),
        nama_file: file.name,
        path,
        ukuran: file.size,
      });
    }

    if (barisBerkas.length > 0) {
      try {
        await jalankan(
          `insert into assignment_files (submission_id, tipe, nama_file, path, ukuran)
           select $1, d.tipe, d.nama_file, d.path, d.ukuran
           from unnest($2::text[], $3::text[], $4::text[], $5::bigint[])
                as d(tipe, nama_file, path, ukuran)`,
          [
            submission.id,
            barisBerkas.map((b) => b.tipe),
            barisBerkas.map((b) => b.nama_file),
            barisBerkas.map((b) => b.path),
            barisBerkas.map((b) => b.ukuran),
          ],
        );
      } catch (err) {
        for (const b of barisBerkas) await hapusBerkas(b.path);
        const pesan = err instanceof Error ? err.message : "tidak diketahui";
        return {
          message: `Gagal menyimpan data berkas: ${pesan}`,
          berhasil: false,
        };
      }
    }
  }

  revalidatePath("/siswa/tugas");
  revalidatePath(`/siswa/tugas/${tugasId}`);
  revalidatePath("/guru/tugas");
  revalidatePath(`/guru/tugas/${tugasId}`);

  return { message: "Tugas berhasil dikumpulkan!", berhasil: true };
}
