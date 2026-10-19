import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSiswa } from "@/lib/sesi-siswa";
import { banyakBaris, satuBaris } from "@/lib/db";
import { ambilKelasUlangan } from "@/lib/ambil-kelas-ulangan";
import { tenggatSudahLewat } from "@/lib/deadline";
import { FormJawaban } from "./form-jawaban";
import { Kartu } from "@/components/ui/kartu";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Notifikasi } from "@/components/ui/notifikasi";
import { IkonBuku } from "@/components/ui/ikon-siswa";

// ============================================================================
// Halaman mengerjakan soal ulangan (status "akan dilaksanakan").
// Siswa menjawab soal PG (radio) & esai (textarea), lalu submit.
// Setelah submit: PG dihitung otomatis, esai menunggu penilaian guru.
// ============================================================================

// Header halaman kerjakan ulangan: tautan kembali + judul.
function Kepala({ judul }: { judul: string }) {
  return (
    <div>
      <Link
        href="/siswa/nilai"
        className="text-sm text-slate-500 transition hover:text-slate-900"
      >
        ← Kembali ke Nilai
      </Link>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">{judul}</h1>
    </div>
  );
}

export default async function KerjakanUlanganPage(
  props: PageProps<"/siswa/ulangan/[id]">,
) {
  const { id } = await props.params;
  const { siswa } = await requireSiswa();

  // Ambil detail ulangan
  const dataUlangan = await satuBaris<{
    id: string;
    judul: string;
    status: "akan" | "sudah" | null;
    tenggat: string | null;
    durasi: number | null;
    nilai_ditampilkan: boolean | null;
    nilai_selesai: boolean | null;
    dibuka: boolean | null;
    kelas_id: string | null;
  }>(
    `select id, judul, status, tenggat, durasi, nilai_ditampilkan,
            nilai_selesai, dibuka, kelas_id
     from exams where id = $1`,
    [id],
  );

  if (!dataUlangan) {
    redirect("/siswa/nilai");
  }

  const hubungan = await banyakBaris<{ kelas_id: string }>(
    `select kelas_id from exam_classes where ulangan_id = $1`,
    [id],
  );

  // Ambil soal terpisah (tanpa kunci jawaban — siswa tidak boleh lihat kunci)
  const soalData = await banyakBaris<{
    id: string;
    soal: string | null;
    jenis: string | null;
    pilihan: string[] | null;
    poin: number | null;
    urutan: number | null;
  }>(
    `select id, soal, jenis, pilihan, poin, urutan
     from exam_questions where exam_id = $1 order by urutan asc`,
    [id],
  );

  // Cek relevansi kelas
  const daftarKelasId = ambilKelasUlangan({
    kelas_id: dataUlangan.kelas_id,
    exam_classes: hubungan,
  });
  const relevan =
    daftarKelasId.length === 0 ||
    (siswa.kelas_id !== null && daftarKelasId.includes(siswa.kelas_id));

  if (!relevan) {
    redirect("/siswa/nilai");
  }

  // Cek status
  if (dataUlangan.status !== "akan") {
    redirect(`/siswa/nilai/${id}`);
  }

  // Cek apakah ulangan ditutup oleh guru (dibuka=false → siswa tidak
  // bisa mengerjakan; yang sudah submit tetap bisa lihat hasilnya).
  const dibukaUlangan = dataUlangan.dibuka !== false;

  // Cek tenggat
  const deadlineLewat = tenggatSudahLewat(dataUlangan.tenggat);

  // Cek apakah siswa sudah submit
  const submitLama = await satuBaris<{
    id: string;
    nilai_pg: number | null;
    nilai_esai: number | null;
    nilai_total: number | null;
    disubmit_at: string | null;
    submitted_at: string | null;
  }>(
    `select id, nilai_pg, nilai_esai, nilai_total, disubmit_at, submitted_at
     from exam_submissions
     where exam_id = $1 and siswa_id = $2`,
    [id, siswa.id],
  );

  // Cek apakah nilai boleh ditampilkan (guru menahan / sudah selesai dinilai)
  const nilaiDitampilkan =
    dataUlangan.nilai_ditampilkan === true || dataUlangan.nilai_selesai === true;

  const soalList = soalData.map((s) => ({
    id: s.id,
    soal: s.soal ?? "",
    jenis: s.jenis ?? "pg",
    pilihan: s.pilihan,
    kunci: null,
    poin: Number(s.poin ?? 0),
    urutan: s.urutan ?? 0,
  }));

  // Jika sudah submit → tampilkan hasil
  if (submitLama) {
    const submit = {
      nilai_pg: Number(submitLama.nilai_pg ?? 0),
      nilai_esai: Number(submitLama.nilai_esai ?? 0),
      nilai_total: Number(submitLama.nilai_total ?? 0),
      disubmit_at: submitLama.disubmit_at ?? submitLama.submitted_at ?? "",
    };
    return (
      <div className="space-y-6">
        <Kepala judul={dataUlangan.judul} />

        <Kartu>
          <div className="flex flex-wrap items-center gap-3">
            <Badge varian="sukses" titik>
              Sudah submit
            </Badge>
            <span className="text-xs text-slate-400">
              {new Date(submit.disubmit_at).toLocaleString("id-ID")}
            </span>
          </div>

          {nilaiDitampilkan ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-center ring-1 ring-blue-100">
                  <p className="text-xs text-blue-600">Nilai PG</p>
                  <p className="text-2xl font-semibold tabular-nums text-blue-700">
                    {submit.nilai_pg}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center ring-1 ring-amber-100">
                  <p className="text-xs text-amber-600">Nilai Esai</p>
                  <p className="text-2xl font-semibold tabular-nums text-amber-700">
                    {submit.nilai_esai}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 text-center ring-1 ring-slate-200">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">
                    {submit.nilai_total}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {submit.nilai_esai === 0
                  ? "Nilai esai masih menunggu penilaian guru."
                  : "Nilai sudah lengkap."}
              </p>
            </>
          ) : (
            <div className="mt-4">
              <Notifikasi varian="info" judul="Jawaban sudah dikumpulkan">
                Nilai kamu ditahan oleh guru dan akan ditampilkan setelah selesai
                dinilai. Nanti kamu bisa lihat di halaman{" "}
                <Link
                  href={`/siswa/nilai/${id}`}
                  className="font-medium underline hover:no-underline"
                >
                  Detail Nilai
                </Link>
                .
              </Notifikasi>
            </div>
          )}
        </Kartu>

        <Link
          href={`/siswa/nilai/${id}`}
          className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Lihat Detail Nilai →
        </Link>
      </div>
    );
  }

  // Jika ulangan ditutup guru + belum submit → tampilkan pesan
  if (!dibukaUlangan && !submitLama) {
    return (
      <div className="space-y-6">
        <Kepala judul={dataUlangan.judul} />

        <Notifikasi varian="gagal" judul="Ulangan ditutup oleh guru">
          Ulangan ini sementara tidak bisa dikerjakan. Nanti guru akan
          membukanya kembali.
        </Notifikasi>
      </div>
    );
  }

  // Jika deadline lewat → tampilkan pesan
  if (deadlineLewat) {
    return (
      <div className="space-y-6">
        <Kepala judul={dataUlangan.judul} />

        <Notifikasi varian="gagal" judul="Ulangan sudah ditutup">
          Tenggat waktu sudah lewat. Hubungi gurumu kalau ada masalah.
        </Notifikasi>
      </div>
    );
  }

  // Belum submit + masih terbuka → tampilkan form
  return (
    <div className="space-y-6">
      <Kepala judul={dataUlangan.judul} />
      <div className="-mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        <span>{soalList.length} soal</span>
        {dataUlangan.durasi !== null ? (
          <span>· Durasi {dataUlangan.durasi} menit</span>
        ) : null}
        {dataUlangan.tenggat ? (
          <span>
            · Tenggat:{" "}
            {new Date(dataUlangan.tenggat).toLocaleString("id-ID")}
          </span>
        ) : null}
      </div>

      {soalList.length === 0 ? (
        <Kartu>
          <EmptyState
            ikon={<IkonBuku className="h-6 w-6" />}
            judul="Soal belum tersedia"
            keterangan="Guru belum menambahkan soal untuk ulangan ini. Coba muat ulang nanti atau hubungi gurumu."
          />
        </Kartu>
      ) : (
        <FormJawaban
          examId={id}
          soalList={soalList}
          tenggat={dataUlangan.tenggat}
          durasi={dataUlangan.durasi}
          nilaiDitampilkan={nilaiDitampilkan}
        />
      )}
    </div>
  );
}
