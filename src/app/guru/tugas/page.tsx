import { BarisTugas } from "@/components/baris-tugas";
import { FormTugas } from "@/components/form-tugas";
import { banyakBaris } from "@/lib/db";
import { requireGuru } from "@/lib/require-guru";
import { hitungRataRata, tampilkanRataRata } from "@/lib/rata-rata";
import {
  LABEL_METODE,
  ambilKelasTugas,
  bacaMetode,
  tugasDibuka,
  type MetodePengumpulan,
} from "@/lib/tugas";

type KelasRow = { id: string; nama_kelas: string };
type SiswaRow = { id: string; kelas_id: string | null };

type TugasRow = {
  id: string;
  judul: string;
  deskripsi: string;
  tenggat: string | null;
  metode: MetodePengumpulan;
  fileDiizinkan: string[];
  daftarKelasId: string[];
  daftarKelasNama: string[];
  terkumpul: number;
  totalSiswa: number;
  rataRata: string;
  dibuka: boolean;
};

function tenggatPendek(iso: string | null): string {
  if (!iso) return "Tanpa tenggat";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(t);
}

export default async function TugasPage() {
  await requireGuru();

  const [kelasList, dataTugas, semuaSiswa, dataHubungan, dataSubmissions] =
    await Promise.all([
      banyakBaris<KelasRow>(
        `select id, nama_kelas from classes order by nama_kelas asc`,
      ),
      banyakBaris<{
        id: string;
        judul: string;
        deskripsi: string | null;
        tenggat: string | null;
        metode: string | null;
        file_diizinkan: string[] | null;
        dibuka: boolean | null;
        created_at: string | null;
      }>(
        `select id, judul, deskripsi, tenggat, metode, file_diizinkan, dibuka, created_at
         from assignments order by created_at desc`,
      ),
      banyakBaris<SiswaRow>(`select id, kelas_id from students`),
      banyakBaris<{ tugas_id: string; kelas_id: string }>(
        `select tugas_id, kelas_id from assignment_classes`,
      ),
      banyakBaris<{ tugas_id: string; nilai: number | null }>(
        `select tugas_id, nilai from assignment_submissions`,
      ),
    ]);

  const namaKelas = new Map(
    kelasList.map((kelas) => [kelas.id, kelas.nama_kelas]),
  );

  const kelasPerTugas = new Map<string, { kelas_id: string }[]>();
  for (const h of dataHubungan) {
    const daftar = kelasPerTugas.get(h.tugas_id) ?? [];
    daftar.push({ kelas_id: h.kelas_id });
    kelasPerTugas.set(h.tugas_id, daftar);
  }

  const nilaiPerTugas = new Map<string, { nilai: number | null }[]>();
  for (const s of dataSubmissions) {
    const daftar = nilaiPerTugas.get(s.tugas_id) ?? [];
    daftar.push({ nilai: s.nilai });
    nilaiPerTugas.set(s.tugas_id, daftar);
  }

  const daftar: TugasRow[] = dataTugas.map((data) => {
    const daftarKelasId = ambilKelasTugas({
      assignment_classes: kelasPerTugas.get(data.id) ?? [],
    });
    const submissions = nilaiPerTugas.get(data.id) ?? [];
    const totalSiswa =
      daftarKelasId.length === 0
        ? semuaSiswa.length
        : semuaSiswa.filter(
            (siswa) =>
              siswa.kelas_id !== null &&
              daftarKelasId.includes(siswa.kelas_id),
          ).length;

    const nilaiList = submissions
      .map((s) => s.nilai)
      .filter((n): n is number => typeof n === "number");

    return {
      id: data.id,
      judul: data.judul,
      deskripsi: data.deskripsi ?? "",
      tenggat: data.tenggat,
      metode: bacaMetode(data.metode),
      fileDiizinkan: data.file_diizinkan ?? [],
      daftarKelasId,
      daftarKelasNama: daftarKelasId.map(
        (idKelas) => namaKelas.get(idKelas) ?? "Kelas tak ditemukan",
      ),
      terkumpul: submissions.length,
      totalSiswa,
      rataRata: tampilkanRataRata(hitungRataRata(nilaiList)),
      dibuka: tugasDibuka(data),
    };
  });

  const galat: string | null = null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tugas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Buat tugas dan tentukan bentuk pengumpulannya: link, file, atau
          keduanya.
        </p>
      </div>

      <FormTugas kelasList={kelasList} />

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        {daftar.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="w-12 px-4 py-3 text-left font-medium text-slate-500 sm:px-5"
                  >
                    No
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-slate-500 sm:px-5"
                  >
                    Judul
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-slate-500 sm:px-5"
                  >
                    Kelas
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-slate-500 sm:px-5"
                  >
                    Metode
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-slate-500 sm:px-5"
                  >
                    Tenggat
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium text-slate-500 sm:px-5"
                  >
                    Terkumpul
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-medium text-slate-500 sm:px-5"
                  >
                    Rata-rata
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-medium text-slate-500 sm:px-5"
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((item, index) => (
                  <BarisTugas
                    key={item.id}
                    nomor={index + 1}
                    id={item.id}
                    judul={item.judul}
                    deskripsi={item.deskripsi}
                    daftarKelasNama={item.daftarKelasNama}
                    daftarKelasId={item.daftarKelasId}
                    metode={item.metode}
                    fileDiizinkan={item.fileDiizinkan}
                    metodeLabel={LABEL_METODE[item.metode]}
                    tenggat={tenggatPendek(item.tenggat)}
                    tenggatIso={item.tenggat}
                    terkumpul={item.terkumpul}
                    totalSiswa={item.totalSiswa}
                    rataRata={item.rataRata}
                    kelasList={kelasList}
                    dibuka={item.dibuka}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-5">
            Belum ada tugas.
          </p>
        )}
      </div>

      {galat ? (
        <p className="text-sm text-red-600">Gagal memuat tugas: {galat}</p>
      ) : null}
    </div>
  );
}
