import { connection } from "next/server";
import { LoginSiswaTabs } from "@/components/login-siswa-tabs";
import { banyakBaris } from "@/lib/db";

type Kelas = { id: string; nama_kelas: string };
type Siswa = {
  id: string;
  nama_siswa: string;
  nis: string | null;
  kelas_id: string | null;
};

// Daftar kelas + siswa untuk dropdown login token. Dibaca di server
// supaya tabel siswa tidak perlu dibuka ke browser.
export default async function LoginSiswaPage() {
  // Dibaca ulang tiap permintaan: daftar siswa berubah setiap kali guru
  // menambah/mengimpor siswa, jadi jangan di-prerender saat build.
  await connection();

  let kelasList: Kelas[] = [];
  let siswaList: Siswa[] = [];

  try {
    const [hasilKelas, hasilSiswa] = await Promise.all([
      banyakBaris<Kelas>(`select id, nama_kelas from classes order by nama_kelas asc`),
      banyakBaris<Siswa>(
        `select id, nama_siswa, nis, kelas_id
         from students
         where kelas_id is not null
         order by nama_siswa asc`,
      ),
    ]);
    kelasList = hasilKelas;
    siswaList = hasilSiswa;
  } catch (err) {
    console.error("Gagal memuat data untuk login siswa:", err);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <LoginSiswaTabs kelasList={kelasList} siswaList={siswaList} />
    </div>
  );
}
