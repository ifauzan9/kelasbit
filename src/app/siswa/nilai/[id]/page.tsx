import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSiswa } from "@/lib/sesi-siswa";
import { banyakBaris, satuBaris } from "@/lib/db";
import {
  ambilKelasUlangan,
  namaKelasDariIds,
} from "@/lib/ambil-kelas-ulangan";
import { tenggatSudahLewat } from "@/lib/deadline";

// ============================================================================
// Detail nilai ulangan per siswa.
// Halaman dilindungi kode akses dari guru: tanpa ?kode=1 (kode sudah
// terverifikasi) siswa hanya melihat form input kode.
// Ulangan status "akan" juga bisa diakses langsung via /siswa/ulangan/[id].
// ============================================================================

import { FormKode } from "./form-kode";

export default async function DetailNilaiPage(props: PageProps<"/siswa/nilai/[id]">) {
  const { id } = await props.params;
  const { siswa } = await requireSiswa();

  const searchParams = await props.searchParams;
  const kodeTerbuka = searchParams.kode === "1";

  const ulangan = await satuBaris<{
    id: string;
    judul: string;
    tanggal: string | null;
    kelas_id: string | null;
    access_code: string | null;
    status: "akan" | "sudah" | null;
    tenggat: string | null;
    durasi: number | null;
    nilai_ditampilkan: boolean | null;
    nilai_selesai: boolean | null;
    dibuka: boolean | null;
  }>(
    `select id, judul, tanggal, kelas_id, access_code, status, tenggat,
            durasi, nilai_ditampilkan, nilai_selesai, dibuka
     from exams where id = $1`,
    [id],
  );

  if (!ulangan) {
    redirect("/siswa/nilai");
  }

  const hubunganKelas = await banyakBaris<{ kelas_id: string }>(
    `select kelas_id from exam_classes where ulangan_id = $1`,
    [id],
  );

  const dataUlangan = {
    id: ulangan.id,
    judul: ulangan.judul,
    tanggal: ulangan.tanggal,
    kelas_id: ulangan.kelas_id,
    access_code: ulangan.access_code,
    status: (ulangan.status ?? "sudah") as "akan" | "sudah",
    tenggat: ulangan.tenggat,
    durasi: ulangan.durasi,
    nilai_ditampilkan: ulangan.nilai_ditampilkan === true,
    nilai_selesai: ulangan.nilai_selesai === true,
    dibuka: ulangan.dibuka,
    exam_classes: hubunganKelas,
  };

  // Apakah nilai boleh dilihat siswa?
  const nilaiTerbuka =
    dataUlangan.nilai_ditampilkan === true || dataUlangan.nilai_selesai === true;

  // Cek submit untuk ulangan bersoal
  let sudahSubmit = false;
  let submitInfo: {
    nilai_pg: number;
    nilai_esai: number;
    nilai_total: number;
    disubmit_at: string;
  } | null = null;

  if (dataUlangan.status === "akan") {
    const submitData = await satuBaris<{
      nilai_pg: number | null;
      nilai_esai: number | null;
      nilai_total: number | null;
      disubmit_at: string | null;
    }>(
      `select nilai_pg, nilai_esai, nilai_total, disubmit_at
       from exam_submissions where exam_id = $1 and siswa_id = $2`,
      [id, siswa.id],
    );

    if (submitData) {
      sudahSubmit = true;
      submitInfo = {
        nilai_pg: submitData.nilai_pg ?? 0,
        nilai_esai: submitData.nilai_esai ?? 0,
        nilai_total: submitData.nilai_total ?? 0,
        disubmit_at: submitData.disubmit_at ?? "",
      };
    }
  }

  const deadlineLewat =
    dataUlangan.status === "akan" &&
    dataUlangan.dibuka !== false &&
    tenggatSudahLewat(dataUlangan.tenggat);

  // Ulangan ditutup guru (kolom baru; null = DDL belum jalan → anggap dibuka)
  const dibukaUlangan = dataUlangan.dibuka !== false;

  // Nama kelas untuk subtitle: gabung kolom lama + relasi baru.
  // [] berarti "Semua kelas".
  const daftarKelasId = ambilKelasUlangan(dataUlangan);
  const kelasData = await banyakBaris<{ id: string; nama_kelas: string }>(
    `select id, nama_kelas from classes order by nama_kelas asc`,
  );
  const mapIdKeNama = new Map(
    kelasData.map((k) => [k.id, k.nama_kelas]),
  );
  const teksKelas =
    daftarKelasId.length === 0
      ? "Semua kelas"
      : namaKelasDariIds(daftarKelasId, mapIdKeNama).join(", ");

  // Nilai siswa ini untuk ulangan ini.
  const nilaiData = await satuBaris<{ nilai: number | null }>(
    `select nilai from exam_scores where exam_id = $1 and siswa_id = $2`,
    [id, siswa.id],
  );

  const nilaiSaya = nilaiData?.nilai ?? null;

  // Badge status
  const badgeStatus =
    dataUlangan.status === "akan" ? (
      !dibukaUlangan ? (
        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
          Ditutup guru
        </span>
      ) : deadlineLewat ? (
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          Ditutup
        </span>
      ) : sudahSubmit ? (
        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          Sudah dijawab
        </span>
      ) : (
        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
          Buka
          {dataUlangan.tenggat
            ? ` · ${new Date(dataUlangan.tenggat).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`
            : ""}
        </span>
      )
    ) : (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
        Selesai
      </span>
    );

  // Kalau ulangan "akan" dan belum submit → tampilkan form jawaban
  // (hanya kalau ulangan dibuka oleh guru; kalau ditutup, tampilkan pesan)
  if (dataUlangan.status === "akan" && !sudahSubmit) {
    if (!dibukaUlangan) {
      return (
        <div className="space-y-6">
          <div>
            <Link
              href="/siswa/nilai"
              className="text-sm text-slate-500 transition hover:text-slate-900"
            >
              ← Kembali ke Daftar Nilai
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {dataUlangan.judul}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-slate-500">Kelas: {teksKelas}</p>
              {badgeStatus}
            </div>
          </div>

          <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-100">
            <p className="text-sm font-medium text-red-700">
              Ulangan ditutup oleh guru
            </p>
            <p className="mt-1 text-xs text-red-600">
              Ulangan ini sementara tidak bisa dikerjakan. Nanti guru akan
              membukanya kembali.
            </p>
          </div>
        </div>
      );
    }

    if (deadlineLewat) {
      return (
        <div className="space-y-6">
          <div>
            <Link
              href="/siswa/nilai"
              className="text-sm text-slate-500 transition hover:text-slate-900"
            >
              ← Kembali ke Daftar Nilai
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {dataUlangan.judul}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-slate-500">Kelas: {teksKelas}</p>
              {badgeStatus}
            </div>
          </div>

          <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-100">
            <p className="text-sm font-medium text-red-700">
              Ulangan sudah ditutup
            </p>
            <p className="mt-1 text-xs text-red-600">
              Tenggat waktu sudah lewat. Hubungi gurumu kalau ada masalah.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/siswa/nilai"
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            ← Kembali ke Daftar Nilai
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {dataUlangan.judul}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-slate-500">Kelas: {teksKelas}</p>
            {badgeStatus}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Mengerjakan Ulangan
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {dataUlangan.tenggat
              ? `Tenggat: ${new Date(dataUlangan.tenggat).toLocaleString("id-ID")}`
              : "Tanpa tenggat waktu."}{" "}
            Arahkan ke halaman kerjakan untuk mulai.
          </p>
          <Link
            href={`/siswa/ulangan/${id}`}
            className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Kerjakan Sekarang →
          </Link>
        </div>
      </div>
    );
  }

  // Kalau ulangan "akan" dan sudah submit → tampilkan hasil
  if (dataUlangan.status === "akan" && sudahSubmit && submitInfo) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/siswa/nilai"
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            ← Kembali ke Daftar Nilai
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {dataUlangan.judul}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-slate-500">Kelas: {teksKelas}</p>
            {badgeStatus}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Hasil kamu
          </p>

          {nilaiTerbuka ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-center">
                  <p className="text-xs text-blue-600">Nilai PG</p>
                  <p className="text-2xl font-semibold tabular-nums text-blue-700">
                    {submitInfo.nilai_pg}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <p className="text-xs text-amber-600">Nilai Esai</p>
                  <p className="text-2xl font-semibold tabular-nums text-amber-700">
                    {submitInfo.nilai_esai}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 text-center">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">
                    {submitInfo.nilai_total}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {submitInfo.nilai_esai === 0
                  ? "Nilai esai masih menunggu penilaian guru."
                  : "Nilai sudah lengkap."}
              </p>
            </>
          ) : (
            <div className="mt-3 rounded-xl bg-violet-50 p-4 ring-1 ring-violet-200">
              <p className="text-sm font-medium text-violet-800">
                📋 Jawaban sudah dikumpulkan
              </p>
              <p className="mt-1 text-xs text-violet-600">
                Nilai kamu ditahan oleh guru dan akan ditampilkan setelah
                selesai dinilai.
              </p>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Submit: {new Date(submitInfo.disubmit_at).toLocaleString("id-ID")}
          </p>
        </div>
      </div>
    );
  }

  // Ulangan "sudah" → alur kode akses yang sudah ada
  if (!kodeTerbuka) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/siswa/nilai"
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            ← Kembali ke Daftar Nilai
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {dataUlangan.judul}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-slate-500">
              Kelas: {teksKelas}
              {dataUlangan.tanggal ? ` · Tanggal: ${dataUlangan.tanggal}` : ""}
            </p>
            {badgeStatus}
          </div>
        </div>

        <FormKode examId={id} />
      </div>
    );
  }

  // Sudah terbuka: tampilkan detail nilai.
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/siswa/nilai"
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          ← Kembali ke Daftar Nilai
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Nilai — {dataUlangan.judul}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-slate-500">
            Kelas: {teksKelas}
            {dataUlangan.tanggal ? ` · Tanggal: ${dataUlangan.tanggal}` : ""}
          </p>
          {badgeStatus}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Nilai kamu
        </p>
        <p
          className={`mt-1 text-4xl font-semibold tabular-nums ${
            nilaiSaya === null
              ? "text-slate-400"
              : nilaiSaya >= 70
                ? "text-emerald-600"
                : nilaiSaya >= 50
                  ? "text-amber-600"
                  : "text-red-600"
          }`}
        >
          {nilaiSaya === null ? "Belum dinilai" : nilaiSaya}
        </p>
        {nilaiSaya === null ? (
          <p className="mt-1 text-sm text-slate-500">
            Nilai kamu untuk ulangan ini belum diinput oleh guru.
          </p>
        ) : null}
      </div>
    </div>
  );
}

