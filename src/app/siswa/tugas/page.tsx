import Link from "next/link";
import { requireSiswa } from "@/lib/sesi-siswa";
import { banyakBaris } from "@/lib/db";
import { tenggatSudahLewat } from "@/lib/deadline";
import { Kartu, KartuJudul } from "@/components/ui/kartu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IkonBuku } from "@/components/ui/ikon-siswa";
import { LABEL_METODE, ambilKelasTugas, bacaMetode, tugasDibuka } from "@/lib/tugas";

function tanggalPendek(iso: string | null): string {
  if (!iso) return "-";
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

type StatusView = {
  label: string;
  varian: "sukses" | "peringatan" | "bahaya" | "netral";
};

export default async function TugasSiswaPage() {
  const { siswa, kelas } = await requireSiswa();

  const [dataTugas, dataSubmit, hubungan] = await Promise.all([
    banyakBaris<{
      id: string;
      judul: string;
      deskripsi: string | null;
      tenggat: string | null;
      metode: string | null;
      dibuka: boolean | null;
      created_at: string | null;
    }>(
      `select id, judul, deskripsi, tenggat, metode, dibuka, created_at
       from assignments order by created_at desc`,
    ),
    banyakBaris<{
      tugas_id: string;
      nilai: number | null;
      umpan_balik: string | null;
      updated_at: string | null;
    }>(
      `select tugas_id, nilai, umpan_balik, updated_at
       from assignment_submissions where siswa_id = $1`,
      [siswa.id],
    ),
    banyakBaris<{ tugas_id: string; kelas_id: string }>(
      `select tugas_id, kelas_id from assignment_classes`,
    ),
  ]);

  const kelasPerTugas = new Map<string, { kelas_id: string }[]>();
  for (const h of hubungan) {
    const daftarKelas = kelasPerTugas.get(h.tugas_id) ?? [];
    daftarKelas.push({ kelas_id: h.kelas_id });
    kelasPerTugas.set(h.tugas_id, daftarKelas);
  }

  const mapSubmit = new Map(
    dataSubmit.map((data) => [data.tugas_id, data] as const),
  );

  const daftar = dataTugas.flatMap((data) => {
    const daftarKelasId = ambilKelasTugas({
      assignment_classes: kelasPerTugas.get(data.id) ?? [],
    });
    const relevan =
      daftarKelasId.length === 0 ||
      (siswa.kelas_id !== null && daftarKelasId.includes(siswa.kelas_id));

    if (!relevan) return [];

    const submit = mapSubmit.get(data.id) ?? null;
    const lewat = tenggatSudahLewat(data.tenggat);
    const dibuka = tugasDibuka(data);

    let status: StatusView;
    if (submit) {
      status = { label: "Sudah dikumpulkan", varian: "sukses" };
    } else if (!dibuka) {
      status = { label: "Ditutup", varian: "bahaya" };
    } else if (lewat) {
      status = { label: "Lewat tenggat", varian: "bahaya" };
    } else {
      status = { label: "Belum dikumpulkan", varian: "peringatan" };
    }

    return [
      {
        id: data.id,
        judul: data.judul,
        deskripsi: data.deskripsi ?? "",
        tenggat: data.tenggat,
        metode: bacaMetode(data.metode),
        nilai: submit?.nilai ?? null,
        umpanBalik: submit?.umpan_balik ?? null,
        dibuka,
        status,
      },
    ];
  });

  const belumKumpul = daftar.filter(
    (t) => t.status.label === "Belum dikumpulkan",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tugas</h1>
        <p className="mt-1 text-sm text-slate-500">
          {kelas?.nama_kelas ?? "Belum ada kelas"} ·{" "}
          {belumKumpul > 0
            ? `${belumKumpul} tugas belum dikumpulkan`
            : "Semua tugas sudah dikumpulkan"}
        </p>
      </div>

      <Kartu>
        <KartuJudul judul="Daftar Tugas" subjudul={`${daftar.length} tugas`} />

        {daftar.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {daftar.map((item) => (
              <li key={item.id} className="py-3">
                <Link
                  href={`/siswa/tugas/${item.id}`}
                  className="group flex items-start justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900 transition group-hover:text-emerald-700">
                      {item.judul}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
                        {LABEL_METODE[item.metode]}
                      </span>
                      <span>Tenggat: {tanggalPendek(item.tenggat)}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Badge varian={item.status.varian} titik>
                      {item.status.label}
                    </Badge>
                    {!item.dibuka && item.status.label === "Sudah dikumpulkan" ? (
                      <Badge varian="bahaya">Ditutup</Badge>
                    ) : null}
                    {item.nilai !== null ? (
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        Nilai: {item.nilai}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            padat
            ikon={<IkonBuku className="h-5 w-5" />}
            judul="Belum ada tugas"
            keterangan="Tugas dari gurumu akan muncul di sini."
          />
        )}
      </Kartu>
    </div>
  );
}
