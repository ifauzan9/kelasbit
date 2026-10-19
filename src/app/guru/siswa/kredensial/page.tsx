import Link from "next/link";
import { PanelKredensialSiswa } from "@/components/import-kredensial";
import { banyakBaris } from "@/lib/db";
import { requireGuru } from "@/lib/require-guru";

export default async function KredensialSiswaPage() {
  await requireGuru();

  const kelasData = await banyakBaris<{ id: string; nama_kelas: string }>(
    `select id, nama_kelas from classes order by nama_kelas asc`,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/guru/siswa"
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Kembali ke Data Siswa
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Kredensial Login Siswa
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Import massal dari Excel atau buat otomatis untuk semua siswa tanpa
          akun.
        </p>
      </div>

      <PanelKredensialSiswa daftarKelas={kelasData} />
    </div>
  );
}
