import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { banyakBaris } from "@/lib/db";
import { buatXlsxSiswa } from "@/lib/export-siswa";
import { guruSudahLogin } from "@/lib/guru-sesi";

// Unduh rekap siswa sebagai file .xlsx
// (No, NIS, Nama, Kelas). Hanya bisa diakses guru yang sudah login.
export async function GET() {
  if (!(await guruSudahLogin())) {
    redirect("/login");
  }

  let siswaData: { id: string; nis: string | null; nama_siswa: string; kelas_id: string | null }[];
  let kelasData: { id: string; nama_kelas: string }[];

  try {
    [siswaData, kelasData] = await Promise.all([
      banyakBaris<{ id: string; nis: string | null; nama_siswa: string; kelas_id: string | null }>(
        `select id, nis, nama_siswa, kelas_id from students`,
      ),
      banyakBaris<{ id: string; nama_kelas: string }>(
        `select id, nama_kelas from classes`,
      ),
    ]);
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "tidak diketahui";
    return NextResponse.json(
      { pesan: `Gagal memuat siswa: ${pesan}` },
      { status: 500 },
    );
  }

  const namaKelas = new Map(kelasData.map((kelas) => [kelas.id, kelas.nama_kelas]));

  const baris = siswaData.map((siswa) => ({
    nis: siswa.nis,
    nama_siswa: siswa.nama_siswa,
    kelas: siswa.kelas_id ? (namaKelas.get(siswa.kelas_id) ?? "") : "",
  }));

  // Urutkan agar nomor urut stabil: nama kelas, lalu nama siswa.
  baris.sort(
    (a, b) =>
      a.kelas.localeCompare(b.kelas, "id", {
        numeric: true,
        sensitivity: "base",
      }) ||
      a.nama_siswa.localeCompare(b.nama_siswa, "id", {
        numeric: true,
        sensitivity: "base",
      }),
  );

  const isiXlsx = await buatXlsxSiswa(baris);

  return new NextResponse(new Uint8Array(isiXlsx), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="data-siswa.xlsx"',
    },
  });
}
