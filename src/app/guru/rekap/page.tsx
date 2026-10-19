import Link from "next/link";
import { banyakBaris } from "@/lib/db";
import { requireGuru } from "@/lib/require-guru";
import { Badge } from "@/components/ui/badge";
import { ambilKelasTugas } from "@/lib/tugas";
import { ambilKelasUlangan } from "@/lib/ambil-kelas-ulangan";
import { relevansiKelas } from "@/lib/rekap";

// ============================================================================
// Rekap Siswa — daftar seluruh siswa dengan ringkasan jumlah kegiatan
// yang sudah/belum dikerjakan. Klik siswa untuk detail + reset.
// ============================================================================

type TugasRow = {
  id: string;
  assignment_classes?: { kelas_id: string }[] | null;
};
type UlanganRow = {
  id: string;
  kelas_id: string | null;
  exam_classes?: { kelas_id: string }[] | null;
};

function AngkaRekap({ selesai, total }: { selesai: number; total: number }) {
  const tuntas = total > 0 && selesai >= total;
  return (
    <Badge varian={tuntas ? "sukses" : selesai > 0 ? "info" : "netral"}>
      {selesai}/{total}
    </Badge>
  );
}

export default async function RekapPage(props: PageProps<"/guru/rekap">) {
  await requireGuru();

  const searchParams = await props.searchParams;
  const kelasFilter =
    typeof searchParams.kelas === "string" ? searchParams.kelas : "";
  const cari =
    typeof searchParams.cari === "string" ? searchParams.cari.trim() : "";

  // Semua relasi banyak-ke-banyak diambil sebagai tabel datar lalu di-join
  // di memori (pengganti nested select Supabase).
  const [
    kelasList,
    semuaSiswa,
    tugasData,
    tugasKelas,
    kumpulData,
    ulanganData,
    ulanganKelas,
    nilaiData,
    submitUlanganData,
    lessonLabKelas,
    latihanLab,
    labSubData,
    lessonKomKelas,
    tantanganKom,
    komHasilData,
  ] = await Promise.all([
    banyakBaris<{ id: string; nama_kelas: string }>(
      `select id, nama_kelas from classes order by nama_kelas asc`,
    ),
    banyakBaris<{
      id: string;
      nis: string | null;
      nama_siswa: string;
      kelas_id: string | null;
    }>(`select id, nis, nama_siswa, kelas_id from students`),
    banyakBaris<{ id: string }>(`select id from assignments`),
    banyakBaris<{ tugas_id: string; kelas_id: string }>(
      `select tugas_id, kelas_id from assignment_classes`,
    ),
    banyakBaris<{ siswa_id: string; tugas_id: string }>(
      `select siswa_id, tugas_id from assignment_submissions`,
    ),
    banyakBaris<{ id: string; kelas_id: string | null }>(
      `select id, kelas_id from exams`,
    ),
    banyakBaris<{ ulangan_id: string; kelas_id: string }>(
      `select ulangan_id, kelas_id from exam_classes`,
    ),
    banyakBaris<{ siswa_id: string; exam_id: string }>(
      `select siswa_id, exam_id from exam_scores`,
    ),
    banyakBaris<{ siswa_id: string; exam_id: string }>(
      `select siswa_id, exam_id from exam_submissions`,
    ),
    banyakBaris<{ lesson_id: string; kelas_id: string }>(
      `select lesson_id, kelas_id from coding_lesson_classes`,
    ),
    banyakBaris<{ id: string; lesson_id: string }>(
      `select id, lesson_id from coding_exercises`,
    ),
    banyakBaris<{ siswa_id: string; exercise_id: string }>(
      `select siswa_id, exercise_id from coding_submissions`,
    ),
    banyakBaris<{ lesson_id: string; kelas_id: string }>(
      `select lesson_id, kelas_id from komputer_lesson_classes`,
    ),
    banyakBaris<{ id: string; lesson_id: string }>(
      `select id, lesson_id from komputer_challenges`,
    ),
    banyakBaris<{ siswa_id: string; challenge_id: string }>(
      `select siswa_id, challenge_id from komputer_hasil`,
    ),
  ]);

  const namaKelas = new Map(kelasList.map((k) => [k.id, k.nama_kelas]));

  // Kelas per tugas/ulangan/modul (relasi banyak-ke-banyak).
  const petaKelasTugas = new Map<string, { kelas_id: string }[]>();
  for (const k of tugasKelas) {
    const daftar = petaKelasTugas.get(k.tugas_id) ?? [];
    daftar.push({ kelas_id: k.kelas_id });
    petaKelasTugas.set(k.tugas_id, daftar);
  }

  const petaKelasUlangan = new Map<string, { kelas_id: string }[]>();
  for (const k of ulanganKelas) {
    const daftar = petaKelasUlangan.get(k.ulangan_id) ?? [];
    daftar.push({ kelas_id: k.kelas_id });
    petaKelasUlangan.set(k.ulangan_id, daftar);
  }

  const petaKelasLab = new Map<string, string[]>();
  for (const k of lessonLabKelas) {
    const daftar = petaKelasLab.get(k.lesson_id) ?? [];
    daftar.push(k.kelas_id);
    petaKelasLab.set(k.lesson_id, daftar);
  }

  const petaKelasKom = new Map<string, string[]>();
  for (const k of lessonKomKelas) {
    const daftar = petaKelasKom.get(k.lesson_id) ?? [];
    daftar.push(k.kelas_id);
    petaKelasKom.set(k.lesson_id, daftar);
  }

  const tugasList: TugasRow[] = tugasData.map((t) => ({
    id: t.id,
    assignment_classes: petaKelasTugas.get(t.id) ?? [],
  }));
  const ulanganList: UlanganRow[] = ulanganData.map((u) => ({
    id: u.id,
    kelas_id: u.kelas_id,
    exam_classes: petaKelasUlangan.get(u.id) ?? [],
  }));

  // Set "siswaId:refId" yang sudah dikerjakan.
  const kumpulSet = new Set(
    kumpulData.map((b) => `${b.siswa_id}:${b.tugas_id}`),
  );
  const nilaiSet = new Set(nilaiData.map((b) => `${b.siswa_id}:${b.exam_id}`));
  const submitUlanganSet = new Set(
    submitUlanganData.map((b) => `${b.siswa_id}:${b.exam_id}`),
  );
  const labSubSet = new Set(
    labSubData.map((b) => `${b.siswa_id}:${b.exercise_id}`),
  );
  const komHasilSet = new Set(
    komHasilData.map((b) => `${b.siswa_id}:${b.challenge_id}`),
  );

  const kelasPerLessonLab = petaKelasLab;
  const kelasPerLessonKom = petaKelasKom;

  // Daftar tugas/ulangan relevan per kelas siswa (dihitung sekali per kelas).
  const rekapPerSiswa = semuaSiswa.map((siswa) => {
    const kelasId = siswa.kelas_id;

    const tugasRelevan = tugasList.filter((t) =>
      relevansiKelas(ambilKelasTugas(t), kelasId),
    );
    const tugasSelesai = tugasRelevan.filter((t) =>
      kumpulSet.has(`${siswa.id}:${t.id}`),
    ).length;

    const ulanganRelevan = ulanganList.filter((u) =>
      relevansiKelas(ambilKelasUlangan(u), kelasId),
    );
    const ulanganSelesai = ulanganRelevan.filter(
      (u) =>
        nilaiSet.has(`${siswa.id}:${u.id}`) ||
        submitUlanganSet.has(`${siswa.id}:${u.id}`),
    ).length;

    const latihanRelevan = latihanLab.filter((l) =>
      relevansiKelas(kelasPerLessonLab.get(l.lesson_id) ?? [], kelasId),
    );
    const labCodingSelesai = latihanRelevan.filter((l) =>
      labSubSet.has(`${siswa.id}:${l.id}`),
    ).length;

    const tantanganRelevan = tantanganKom.filter((t) =>
      relevansiKelas(kelasPerLessonKom.get(t.lesson_id) ?? [], kelasId),
    );
    const labKomputerSelesai = tantanganRelevan.filter((t) =>
      komHasilSet.has(`${siswa.id}:${t.id}`),
    ).length;

    return {
      siswa,
      tugasSelesai,
      tugasTotal: tugasRelevan.length,
      ulanganSelesai,
      ulanganTotal: ulanganRelevan.length,
      labCodingSelesai,
      labCodingTotal: latihanRelevan.length,
      labKomputerSelesai,
      labKomputerTotal: tantanganRelevan.length,
    };
  });

  const tersaring = rekapPerSiswa
    .filter((r) => !kelasFilter || r.siswa.kelas_id === kelasFilter)
    .filter((r) => {
      if (!cari) return true;
      const teks = cari.toLowerCase();
      const nama = r.siswa.nama_siswa.toLowerCase();
      const nis = (r.siswa.nis ?? "").toLowerCase();
      return nama.includes(teks) || nis.includes(teks);
    })
    .sort((a, b) => {
      const kA = a.siswa.kelas_id
        ? (namaKelas.get(a.siswa.kelas_id) ?? "")
        : "";
      const kB = b.siswa.kelas_id
        ? (namaKelas.get(b.siswa.kelas_id) ?? "")
        : "";
      if (kA !== kB) return kA.localeCompare(kB, "id");
      return a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa, "id", {
        numeric: true,
        sensitivity: "base",
      });
    });

  const galat: string | null = null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Rekap Siswa</h1>
        <p className="mt-1 text-sm text-slate-500">
          Rekap seluruh kegiatan tiap siswa. Buka nama siswa untuk melihat
          detail dan mereset pengerjaannya.
        </p>
      </div>

      <form
        method="get"
        action="/guru/rekap"
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div>
          <label
            htmlFor="kelas"
            className="block text-xs font-medium text-slate-500"
          >
            Kelas
          </label>
          <select
            id="kelas"
            name="kelas"
            defaultValue={kelasFilter}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-44"
          >
            <option value="">Semua kelas</option>
            {kelasList.map((kelas) => (
              <option key={kelas.id} value={kelas.id}>
                {kelas.nama_kelas}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label
            htmlFor="cari"
            className="block text-xs font-medium text-slate-500"
          >
            Cari
          </label>
          <input
            id="cari"
            type="search"
            name="cari"
            defaultValue={cari}
            placeholder="Cari nama atau NIS..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Tampilkan
        </button>
        {kelasFilter || cari ? (
          <Link
            href="/guru/rekap"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Reset filter
          </Link>
        ) : null}
      </form>

      <p className="text-sm text-slate-500">
        {cari || kelasFilter
          ? `Menampilkan ${tersaring.length} dari ${semuaSiswa.length} siswa`
          : `${semuaSiswa.length} siswa`}
      </p>

      {tersaring.length > 0 ? (
        <>
          {/* Kartu untuk layar kecil */}
          <ul className="space-y-3 lg:hidden">
            {tersaring.map((r) => (
              <li
                key={r.siswa.id}
                className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              >
                <Link
                  href={`/guru/rekap/${r.siswa.id}`}
                  className="text-sm font-semibold text-slate-900 hover:underline"
                >
                  {r.siswa.nama_siswa}
                </Link>
                <p className="mt-0.5 text-xs text-slate-400">
                  {r.siswa.nis ? `NIS ${r.siswa.nis} · ` : ""}
                  {r.siswa.kelas_id
                    ? (namaKelas.get(r.siswa.kelas_id) ?? "Kelas tak ditemukan")
                    : "Belum ada kelas"}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">Tugas</dt>
                    <dd>
                      <AngkaRekap
                        selesai={r.tugasSelesai}
                        total={r.tugasTotal}
                      />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">Ulangan</dt>
                    <dd>
                      <AngkaRekap
                        selesai={r.ulanganSelesai}
                        total={r.ulanganTotal}
                      />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">Lab Coding</dt>
                    <dd>
                      <AngkaRekap
                        selesai={r.labCodingSelesai}
                        total={r.labCodingTotal}
                      />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500">Lab Komputer</dt>
                    <dd>
                      <AngkaRekap
                        selesai={r.labKomputerSelesai}
                        total={r.labKomputerTotal}
                      />
                    </dd>
                  </div>
                </dl>
                <Link
                  href={`/guru/rekap/${r.siswa.id}`}
                  className="mt-3 inline-block text-xs font-medium text-emerald-700 hover:underline"
                >
                  Lihat rekap & reset →
                </Link>
              </li>
            ))}
          </ul>

          {/* Tabel untuk layar besar */}
          <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left font-medium text-slate-500">
                      No
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">
                      Kelas
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">
                      Tugas
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">
                      Ulangan
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">
                      Lab Coding
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">
                      Lab Komputer
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tersaring.map((r, index) => (
                    <tr key={r.siswa.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-900">
                        <Link
                          href={`/guru/rekap/${r.siswa.id}`}
                          className="font-medium hover:underline"
                        >
                          {r.siswa.nama_siswa}
                        </Link>
                        {r.siswa.nis ? (
                          <span className="ml-1 text-xs text-slate-400">
                            ({r.siswa.nis})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.siswa.kelas_id
                          ? (namaKelas.get(r.siswa.kelas_id) ??
                            "Kelas tak ditemukan")
                          : "Belum ada kelas"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AngkaRekap
                          selesai={r.tugasSelesai}
                          total={r.tugasTotal}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AngkaRekap
                          selesai={r.ulanganSelesai}
                          total={r.ulanganTotal}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AngkaRekap
                          selesai={r.labCodingSelesai}
                          total={r.labCodingTotal}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AngkaRekap
                          selesai={r.labKomputerSelesai}
                          total={r.labKomputerTotal}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/guru/rekap/${r.siswa.id}`}
                          className="text-sm font-medium text-emerald-700 hover:underline"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          {semuaSiswa.length === 0
            ? "Belum ada siswa."
            : "Tidak ada siswa yang cocok dengan filter."}
        </p>
      )}

      {galat ? (
        <p className="text-sm text-red-600">Gagal memuat rekap: {galat}</p>
      ) : null}
    </div>
  );
}
