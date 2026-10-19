import { NextResponse } from "next/server";
import { bacaBerkas } from "@/lib/berkas";
import { banyakBaris, satuBaris } from "@/lib/db";
import { ambilSesiGuru } from "@/lib/guru-sesi";
import { ambilSesiSiswa } from "@/lib/sesi-siswa";

// ============================================================================
// Unduh berkas tugas dari filesystem hosting.
//
// Berkas TIDAK disajikan langsung dari public/ — semua permintaan lewat sini
// supaya bisa diperiksa:
//   - guru yang login boleh mengunduh semua berkas,
//   - siswa hanya boleh mengunduh berkas miliknya sendiri (atau berkas tugas
//     yang memang untuk kelasnya) — di sini dibatasi ke miliknya sendiri.
// ============================================================================

const TIPE_ISI: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function tipeDari(nama: string): string {
  const titik = nama.lastIndexOf(".");
  if (titik < 0) return "application/octet-stream";
  return TIPE_ISI[nama.slice(titik).toLowerCase()] ?? "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const pathRelatif = path.join("/");

  const [sesiGuru, sesiSiswa] = await Promise.all([
    ambilSesiGuru(),
    ambilSesiSiswa(),
  ]);

  if (!sesiGuru && !sesiSiswa) {
    return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  }

  const berkas = await satuBaris<{ nama_file: string; path: string }>(
    `select nama_file, path from assignment_files where path = $1`,
    [pathRelatif],
  );

  if (!berkas) {
    return NextResponse.json(
      { pesan: "Berkas tidak ditemukan." },
      { status: 404 },
    );
  }

  // Siswa hanya boleh mengunduh berkas dari pengumpulannya sendiri.
  if (!sesiGuru && sesiSiswa) {
    const milikSendiri = await banyakBaris<{ id: string }>(
      `select f.id
       from assignment_files f
       join assignment_submissions s on s.id = f.submission_id
       where f.path = $1 and s.siswa_id = $2`,
      [pathRelatif, sesiSiswa.siswaId],
    );

    if (milikSendiri.length === 0) {
      return NextResponse.json({ pesan: "Akses ditolak." }, { status: 403 });
    }
  }

  const isi = await bacaBerkas(pathRelatif);
  if (!isi) {
    return NextResponse.json(
      { pesan: "Berkas tidak ditemukan di server." },
      { status: 404 },
    );
  }

  const namaAman = berkas.nama_file.replace(/["\r\n]/g, "_");

  return new NextResponse(new Uint8Array(isi), {
    status: 200,
    headers: {
      "Content-Type": tipeDari(berkas.nama_file),
      "Content-Disposition": `inline; filename="${namaAman}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
