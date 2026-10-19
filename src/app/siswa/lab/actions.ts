"use server";

import { revalidatePath } from "next/cache";
import { requireSiswa } from "@/lib/sesi-siswa";
import { banyakBaris, jalankan, placeholders, satuBaris } from "@/lib/db";
import {
  cekKaryaBebas,
  cekVariabelWajib,
  inputSesuaiWajib,
  keluaranCocok,
  bandingkanPerBaris,
  pesanBanding,
  pecahInput,
  type AnalisisBebas,
  type AturanBebas,
} from "@/lib/lab";

// ============================================================================
// Simpan hasil terakhir siswa untuk satu latihan lab. Dipanggil setiap kali
// siswa menekan "Jalankan" (hasil lama ditimpa).
//
// Penilaian dilakukan di server, bukan dipercaya dari browser:
//   - jenis "output": output dicocokkan dengan keluaran_diharapkan.
//   - jenis "bebas" : syarat kode dicek dari analisis AST worker Pyodide.
// Tantangan juga dikunci berurutan: level hanya bisa dinilai kalau semua level
// sebelumnya di modul yang sama sudah pernah benar.
// ============================================================================

export type HasilSimpanLab = {
  sukses: boolean;
  message: string | null;
  percobaan: number;
  pernahBenar: boolean;
  benar: boolean;
  petunjuk: string | null;
};

const HASIL_GAGAL: HasilSimpanLab = {
  sukses: false,
  message: null,
  percobaan: 0,
  pernahBenar: false,
  benar: false,
  petunjuk: null,
};

// Petunjuk saat output belum cocok. Kasus tersering di modul input():
// siswa menulis input("Nama: ") sehingga teks label ikut tercetak.
// Urutan pemeriksaan mengikuti spesifikasi: jumlah baris → isi baris yang
// berbeda → spasi di awal baris. Pesan tidak pernah memuat isi target, supaya
// siswa tetap membaca soal dan memperbaiki kodenya sendiri.
function petunjukOutputSalah(
  keluaran: string,
  diharapkan: string,
  analisis: AnalisisBebas | null | undefined,
): string {
  if ((analisis?.input_berprompt ?? 0) > 0) {
    return 'Output belum sesuai. Kamu menulis teks di dalam input("..."). Teks itu hanya tampil di modal, bukan bagian output, jadi jangan di-print ulang.';
  }
  const banding = bandingkanPerBaris(keluaran, diharapkan);
  if (banding.cocok) return "Output sudah sesuai.";
  return `Output belum sesuai. ${pesanBanding(banding)}`;
}

export async function simpanHasilLab(input: {
  exerciseId: string;
  kode: string;
  keluaran: string;
  keluaranUji?: string | null;
  galatUji?: string | null;
  /** Baris input yang benar-benar dikonsumsi input() pada run utama. */
  masukanDipakai?: string[] | null;
  analisis?: AnalisisBebas | null;
}): Promise<HasilSimpanLab> {
  const { siswa } = await requireSiswa();

  const exerciseId = String(input.exerciseId ?? "").trim();
  if (!exerciseId) {
    return { ...HASIL_GAGAL, message: "Latihan tidak ditemukan." };
  }

  // Ambil latihan (jenis, target output, aturan, level, modul, input wajib).
  const exerciseRow = await satuBaris<{
    lesson_id: string;
    level: number;
    jenis: string | null;
    keluaran_diharapkan: string | null;
    aturan: AturanBebas | string | null;
    masukan: string | null;
    masukan_uji: string | null;
    keluaran_uji: string | null;
  }>(
    `select lesson_id, level, jenis, keluaran_diharapkan, aturan,
            masukan, masukan_uji, keluaran_uji
     from coding_exercises where id = $1`,
    [exerciseId],
  );

  if (!exerciseRow) {
    return { ...HASIL_GAGAL, message: "Latihan tidak ditemukan." };
  }

  // `aturan` jsonb kadang datang sebagai string; samakan ke objek.
  if (typeof exerciseRow.aturan === "string") {
    try {
      exerciseRow.aturan = JSON.parse(exerciseRow.aturan) as AturanBebas;
    } catch {
      exerciseRow.aturan = null;
    }
  }

  // Pastikan latihan ini memang untuk kelas siswa (kalau ada target kelas).
  const kelasTarget = await banyakBaris<{ kelas_id: string }>(
    `select kelas_id from coding_lesson_classes where lesson_id = $1`,
    [exerciseRow.lesson_id],
  );

  const daftarKelasId = kelasTarget.map((baris) => baris.kelas_id);
  const relevan =
    daftarKelasId.length === 0 ||
    (siswa.kelas_id !== null && daftarKelasId.includes(siswa.kelas_id));

  if (!relevan) {
    return { ...HASIL_GAGAL, message: "Latihan ini tidak tersedia untuk kelasmu." };
  }

  // Kunci berurutan: semua level sebelumnya harus sudah pernah benar.
  const sebelumnya = await banyakBaris<{ id: string }>(
    `select id from coding_exercises
     where lesson_id = $1 and level < $2`,
    [exerciseRow.lesson_id, exerciseRow.level],
  );

  const idSebelumnya = sebelumnya.map((b) => b.id);

  if (idSebelumnya.length > 0) {
    const selesaiData = await banyakBaris<{ exercise_id: string }>(
      `select exercise_id from coding_submissions
       where siswa_id = $1 and pernah_benar = true
         and exercise_id in (${placeholders(idSebelumnya.length, 2)})`,
      [siswa.id, ...idSebelumnya],
    );

    const selesai = new Set(selesaiData.map((b) => b.exercise_id));

    if (selesai.size < idSebelumnya.length) {
      return {
        ...HASIL_GAGAL,
        message: "Selesaikan tantangan sebelumnya dulu.",
      };
    }
  }

  const keluaranTeks = String(input.keluaran ?? "");
  const keluaranUjiTeks =
    typeof input.keluaranUji === "string" ? input.keluaranUji : null;
  const galatUjiTeks =
    typeof input.galatUji === "string" && input.galatUji.trim()
      ? input.galatUji
      : null;

  const aturan = exerciseRow.aturan ?? {};
  // Ada uji internal (input berbeda) untuk latihan ini?
  const adaUji = Boolean(exerciseRow.masukan_uji?.trim());
  // Input wajib modul input(). Kosong untuk modul lama (Modul 1 & 2).
  const inputWajib = pecahInput(exerciseRow.masukan);
  // Baris yang benar-benar dikonsumsi input() saat run utama.
  const inputDipakai = Array.isArray(input.masukanDipakai)
    ? input.masukanDipakai.map((baris) => String(baris))
    : null;
  // Siswa mengganti input wajib? Kalau ya, target output tidak lagi berarti.
  const inputDiubah =
    inputWajib.length > 0 && !inputSesuaiWajib(inputDipakai, inputWajib);

  // Penilaian di server.
  let benarBaru: boolean;
  let petunjuk: string | null = null;

  if (exerciseRow.jenis === "bebas") {
    const hasilCek = cekKaryaBebas(input.analisis, keluaranTeks, aturan);
    benarBaru = hasilCek.benar;
    petunjuk = hasilCek.petunjuk;

    // Karya bebas: output harus berubah saat inputnya diganti.
    if (benarBaru && aturan.wajib_dinamis) {
      if (galatUjiTeks) {
        benarBaru = false;
        petunjuk =
          "Dengan input berbeda, program berhenti karena error. Pastikan program memakai data dari input() dan menampilkan semua masukan.";
      } else if (keluaranUjiTeks === null) {
        benarBaru = false;
        petunjuk =
          "Program perlu diuji ulang dengan input berbeda. Tekan Run Python sekali lagi.";
      } else if (keluaranCocok(keluaranUjiTeks, keluaranTeks)) {
        benarBaru = false;
        petunjuk =
          "Output tidak berubah saat inputnya diganti. Pastikan semua data ditampilkan dari variabel hasil input().";
      }
    }
  } else {
    // Target output hanya berlaku untuk input wajib yang tertulis di soal.
    // Dicek lebih dulu supaya pesan "input berbeda" tidak menutupi pesan
    // bahwa program tidak memakai input sama sekali (hardcode).
    benarBaru = !inputDiubah;
    petunjuk = inputDiubah
      ? "Input yang kamu pakai berbeda dari input wajib. Ketik ulang input wajib persis seperti yang tertulis, lalu tekan Run Python lagi."
      : null;

    if (benarBaru && !keluaranCocok(keluaranTeks, exerciseRow.keluaran_diharapkan ?? "")) {
      benarBaru = false;
      petunjuk = petunjukOutputSalah(
        keluaranTeks,
        exerciseRow.keluaran_diharapkan ?? "",
        input.analisis,
      );
    }

    // Pastikan variabel wajib benar-benar dibuat, diisi dari input(), dan
    // ditampilkan dengan print().
    if (benarBaru) {
      const cekVar = cekVariabelWajib(input.analisis, aturan.variabel_wajib ?? [], {
        dariInput: aturan.dari_input === true,
      });
      benarBaru = cekVar.benar;
      petunjuk = cekVar.petunjuk;
    }

    // Larangan perulangan (mis. tantangan "PESAN BERULANG").
    if (benarBaru && aturan.tanpa_loop && (input.analisis?.jumlah_loop ?? 0) > 0) {
      benarBaru = false;
      petunjuk =
        "Tantangan ini diminta tanpa perulangan. Tulis print() beberapa kali, bukan for/while.";
    }

    // Uji internal: kode yang sama dijalankan dengan input berbeda.
    // Fail-closed: latihan bermodul input WAJIB punya uji. Kalau uji tidak
    // tersedia, jangan pernah meloloskan jawaban tanpa uji.
    if (benarBaru && (adaUji || inputWajib.length > 0)) {
      if (!adaUji || !exerciseRow.keluaran_uji?.trim()) {
        benarBaru = false;
        petunjuk =
          "Soal ini belum siap dinilai karena data ujinya tidak lengkap. Hubungi gurumu.";
      } else if (galatUjiTeks) {
        benarBaru = false;
        petunjuk =
          "Dengan input berbeda, program berhenti karena error. Pastikan jumlah input() dan pengolahan datanya benar.";
      } else if (keluaranUjiTeks === null) {
        benarBaru = false;
        petunjuk =
          "Program perlu diuji ulang dengan input berbeda. Tekan Run Python sekali lagi.";
      } else if (
        !keluaranCocok(keluaranUjiTeks, exerciseRow.keluaran_uji)
      ) {
        benarBaru = false;
        petunjuk =
          "Dengan input berbeda, output tidak sesuai. Pastikan program mengolah data dari input(), bukan menulis jawaban langsung.";
      }
    }
  }

  const dataLama = await satuBaris<{
    percobaan: number | null;
    pernah_benar: boolean | null;
  }>(
    `select percobaan, pernah_benar from coding_submissions
     where exercise_id = $1 and siswa_id = $2`,
    [exerciseId, siswa.id],
  );

  const percobaanLama = dataLama?.percobaan ?? 0;
  const pernahLama = dataLama?.pernah_benar ?? false;
  const percobaanBaru = percobaanLama + 1;
  const pernahBenarBaru = pernahLama || benarBaru;

  try {
    await jalankan(
      `insert into coding_submissions
         (exercise_id, siswa_id, kode, keluaran, benar, pernah_benar,
          percobaan, masukan_dipakai, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())
       on conflict (exercise_id, siswa_id)
       do update set kode = excluded.kode,
                     keluaran = excluded.keluaran,
                     benar = excluded.benar,
                     pernah_benar = excluded.pernah_benar,
                     percobaan = excluded.percobaan,
                     masukan_dipakai = excluded.masukan_dipakai,
                     updated_at = now()`,
      [
        exerciseId,
        siswa.id,
        String(input.kode ?? ""),
        keluaranTeks,
        benarBaru,
        pernahBenarBaru,
        percobaanBaru,
        inputDipakai,
      ],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      sukses: false,
      message: `Gagal menyimpan hasil: ${pesan}`,
      percobaan: percobaanLama,
      pernahBenar: pernahLama,
      benar: benarBaru,
      petunjuk,
    };
  }

  revalidatePath("/siswa/lab");
  revalidatePath("/guru/lab/hasil");

  return {
    sukses: true,
    message: null,
    percobaan: percobaanBaru,
    pernahBenar: pernahBenarBaru,
    benar: benarBaru,
    petunjuk,
  };
}

// ============================================================================
// Ambil input uji (input berbeda) untuk sebuah latihan.
//
// Sengaja dipisah dari data halaman: isinya baru diambil saat siswa menekan
// Run, jadi tidak ikut terkirim waktu halaman dimuat. Dipakai untuk menguji
// bahwa program benar-benar mengolah data dari input(), bukan menulis jawaban.
// ============================================================================
export async function ambilMasukanUji(
  exerciseId: string,
): Promise<{ masukan: string } | null> {
  await requireSiswa();

  const id = String(exerciseId ?? "").trim();
  if (!id) return null;

  const data = await satuBaris<{ masukan_uji: string | null }>(
    `select masukan_uji from coding_exercises where id = $1`,
    [id],
  );

  const masukan = data?.masukan_uji;
  if (!masukan || !masukan.trim()) return null;

  return { masukan };
}
