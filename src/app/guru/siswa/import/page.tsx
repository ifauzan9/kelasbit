import Link from "next/link";
import { ImportSiswa } from "@/components/import-siswa";
import { requireGuru } from "@/lib/require-guru";

export default async function ImportSiswaPage() {
  await requireGuru();

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
          Import Siswa dari Excel
        </h1>
      </div>

      <ImportSiswa />
    </div>
  );
}
