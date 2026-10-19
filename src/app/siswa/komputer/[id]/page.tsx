import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSiswa } from "@/lib/sesi-siswa";
import { banyakBaris, satuBaris } from "@/lib/db";
import { Kartu } from "@/components/ui/kartu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IkonKomputer } from "@/components/ui/ikon-siswa";

export default async function ModulKomputerSiswaPage(
  props: PageProps<"/siswa/komputer/[id]">,
) {
  const { id } = await props.params;
  const { siswa } = await requireSiswa();

  const lessonData = await satuBaris<{
    id: string;
    judul: string;
    isi: string | null;
  }>(`select id, judul, isi from komputer_lessons where id = $1`, [id]);

  if (!lessonData) redirect("/siswa/komputer");

  const lesson = {
    id: lessonData.id,
    judul: lessonData.judul,
    isi: lessonData.isi ?? "",
  };

  const hubungan = await banyakBaris<{ kelas_id: string }>(
    `select kelas_id from komputer_lesson_classes where lesson_id = $1`,
    [id],
  );

  const daftarKelasId = hubungan.map((hub) => hub.kelas_id);
  const relevan =
    daftarKelasId.length === 0 ||
    (siswa.kelas_id !== null && daftarKelasId.includes(siswa.kelas_id));

  if (!relevan) redirect("/siswa/komputer");

  const [tantanganData, submitData] = await Promise.all([
    banyakBaris<{
      id: string;
      level: number | null;
      judul: string;
      jenis: string | null;
      poin: number | null;
      urutan: number | null;
    }>(
      `select id, level, judul, jenis, poin, urutan
       from komputer_challenges where lesson_id = $1 order by level asc`,
      [id],
    ),
    banyakBaris<{
      challenge_id: string;
      benar: boolean | null;
      pernah_benar: boolean | null;
      percobaan: number | null;
    }>(
      `select challenge_id, benar, pernah_benar, percobaan
       from komputer_hasil where siswa_id = $1`,
      [siswa.id],
    ),
  ]);

  const petaHasil = new Map(
    submitData.map((data) => [data.challenge_id, data] as const),
  );

  const tantangan = tantanganData.map((row) => ({
    id: row.id,
    level: row.level ?? 0,
    judul: row.judul,
    jenis: row.jenis ?? "klik",
    poin: row.poin ?? 0,
  }));

  const selesai = tantangan.filter(
    (t) => petaHasil.get(t.id)?.pernah_benar === true,
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/siswa/komputer"
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Kembali ke daftar modul
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {lesson.judul}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {selesai}/{tantangan.length} tantangan selesai
        </p>
      </div>

      {lesson.isi ? (
        <Kartu>
          <p className="text-sm whitespace-pre-wrap text-slate-700">
            {lesson.isi}
          </p>
        </Kartu>
      ) : null}

      <div className="space-y-3">
        {tantangan.length > 0 ? (
          tantangan.map((item) => {
            const hasil = petaHasil.get(item.id);
            const sudah = hasil?.pernah_benar === true;
            const pernahCoba = Boolean(hasil);
            return (
              <Link
                key={item.id}
                href={`/siswa/komputer/${id}/${item.level}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-emerald-300"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                      sudah
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.level}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {item.judul}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.poin} poin
                    </span>
                  </span>
                </span>
                <span className="shrink-0">
                  {sudah ? (
                    <Badge varian="sukses" titik>
                      Selesai
                    </Badge>
                  ) : pernahCoba ? (
                    <Badge varian="peringatan">Dikerjakan</Badge>
                  ) : (
                    <Badge varian="netral">Belum</Badge>
                  )}
                </span>
              </Link>
            );
          })
        ) : (
          <Kartu>
            <EmptyState
              ikon={<IkonKomputer className="h-6 w-6" />}
              judul="Belum ada tantangan"
              keterangan="Tantangan untuk modul ini belum tersedia."
            />
          </Kartu>
        )}
      </div>
    </div>
  );
}
