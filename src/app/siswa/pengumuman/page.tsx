import { requireSiswa } from "@/lib/sesi-siswa";
import { banyakBaris } from "@/lib/db";
import { sudahTampil } from "@/lib/jadwal-pengumuman";
import { Kartu } from "@/components/ui/kartu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IkonPengumuman } from "@/components/ui/ikon-siswa";

type BarisPengumuman = {
  id: string;
  judul: string;
  isi: string;
  created_at: string | null;
  mulai_pada: string | null;
};

function tanggalPendek(iso: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(t);
}

export default async function PengumumanSiswaPage() {
  const { siswa, kelas } = await requireSiswa();

  const [pengumumanData, hubungan] = await Promise.all([
    banyakBaris<BarisPengumuman>(
      `select id, judul, isi, created_at, mulai_pada from announcements`,
    ),
    banyakBaris<{ pengumuman_id: string; kelas_id: string }>(
      `select pengumuman_id, kelas_id from announcement_classes`,
    ),
  ]);

  const kelasPerPengumuman = new Map<string, string[]>();
  for (const h of hubungan) {
    const daftar = kelasPerPengumuman.get(h.pengumuman_id) ?? [];
    daftar.push(h.kelas_id);
    kelasPerPengumuman.set(h.pengumuman_id, daftar);
  }

  // Pengumuman yang berlaku untuk kelas saya:
  //  - ada di announcement_classes untuk kelas saya, atau
  //  - "semua kelas" (tidak ada baris di announcement_classes).
  // Pengumuman terjadwal yang belum waktunya disembunyikan.
  const relevan = pengumumanData
    .map((row) => ({
      ...row,
      hubungannya: kelasPerPengumuman.get(row.id) ?? [],
    }))
    .filter((row) => {
      if (!sudahTampil(row.mulai_pada)) return false;
      const berlakuSemua = row.hubungannya.length === 0;
      const untukKelasSaya = siswa.kelas_id
        ? row.hubungannya.includes(siswa.kelas_id)
        : false;
      return berlakuSemua || untukKelasSaya;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pengumuman</h1>
        <p className="mt-1 text-sm text-slate-500">
          {kelas
            ? `Pengumuman untuk kelas ${kelas.nama_kelas}.`
            : "Kamu belum masuk kelas. Pengumuman yang ditampilkan berlaku untuk semua kelas."}
        </p>
      </div>

      {relevan.length > 0 ? (
        <div className="space-y-3">
          {relevan.map((row) => {
            const berlakuSemua = row.hubungannya.length === 0;
            return (
              <Kartu key={row.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-slate-900">{row.judul}</h2>
                  <div className="flex items-center gap-2">
                    <Badge varian={berlakuSemua ? "netral" : "info"}>
                      {berlakuSemua
                        ? "Semua kelas"
                        : `Kelas ${kelas?.nama_kelas ?? ""}`}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {tanggalPendek(row.created_at)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {row.isi}
                </p>
              </Kartu>
            );
          })}
        </div>
      ) : (
        <Kartu>
          <EmptyState
            ikon={<IkonPengumuman className="h-6 w-6" />}
            judul="Belum ada pengumuman"
            keterangan="Pengumuman dari guru akan muncul di sini."
          />
        </Kartu>
      )}
    </div>
  );
}
