"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ambilSesiSiswa } from "@/lib/sesi-siswa";
import { jalankan, satuBaris } from "@/lib/db";

// ============================================================================
// Simpan hasil tantangan Lab Komputer. Dipanggil setiap kali siswa menjawab
// (benar/salah). Hasil lama ditimpa; `pernah_benar` dipakai untuk progres.
// ============================================================================

export type HasilSimpanKomputer = {
  sukses: boolean;
  message: string | null;
  percobaan: number;
  pernahBenar: boolean;
};

export async function simpanHasilKomputer(input: {
  challengeId: string;
  benar: boolean;
  waktuMs?: number | null;
  skor?: number | null;
}): Promise<HasilSimpanKomputer> {
  const sesi = await ambilSesiSiswa();
  if (!sesi) redirect("/login-siswa");

  const challengeId = String(input.challengeId ?? "").trim();
  if (!challengeId) {
    return {
      sukses: false,
      message: "Tantangan tidak ditemukan.",
      percobaan: 0,
      pernahBenar: false,
    };
  }

  const dataLama = await satuBaris<{
    percobaan: number | null;
    pernah_benar: boolean | null;
    waktu_ms: number | null;
    skor: number | null;
  }>(
    `select percobaan, pernah_benar, waktu_ms, skor
     from komputer_hasil where challenge_id = $1 and siswa_id = $2`,
    [challengeId, sesi.siswaId],
  );

  const percobaanLama = dataLama?.percobaan ?? 0;
  const pernahLama = dataLama?.pernah_benar ?? false;
  const percobaanBaru = percobaanLama + 1;
  const pernahBaru = pernahLama || Boolean(input.benar);

  // Simpan waktu tercepat & skor terbaik (hanya saat benar).
  let waktuBaru = dataLama?.waktu_ms ?? null;
  if (
    input.benar &&
    input.waktuMs != null &&
    (waktuBaru == null || input.waktuMs < waktuBaru)
  ) {
    waktuBaru = input.waktuMs;
  }
  let skorBaru = dataLama?.skor ?? null;
  if (
    input.benar &&
    input.skor != null &&
    (skorBaru == null || input.skor > skorBaru)
  ) {
    skorBaru = input.skor;
  }

  try {
    await jalankan(
      `insert into komputer_hasil
         (challenge_id, siswa_id, benar, pernah_benar, percobaan,
          waktu_ms, skor, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (challenge_id, siswa_id)
       do update set benar = excluded.benar,
                     pernah_benar = excluded.pernah_benar,
                     percobaan = excluded.percobaan,
                     waktu_ms = excluded.waktu_ms,
                     skor = excluded.skor,
                     updated_at = now()`,
      [
        challengeId,
        sesi.siswaId,
        Boolean(input.benar),
        pernahBaru,
        percobaanBaru,
        waktuBaru,
        skorBaru,
      ],
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return {
      sukses: false,
      message: `Gagal menyimpan hasil: ${pesan}`,
      percobaan: percobaanLama,
      pernahBenar: pernahLama,
    };
  }

  revalidatePath("/siswa/komputer");
  revalidatePath("/guru/komputer/hasil");

  return {
    sukses: true,
    message: null,
    percobaan: percobaanBaru,
    pernahBenar: pernahBaru,
  };
}
