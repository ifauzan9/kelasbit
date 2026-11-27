import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { tugas, tugasQuestions } from "../src/lib/db/schema.ts";

type QuestionSeed = {
  title: string;
  description: string;
  solutionCode: string;
  expectedOutput: string;
  exactInputs: number;
  inputVariables: string[];
  literalVariables: string[];
  requiredVariables: string[];
  minPrints?: number;
  minOutputLines?: number;
};

const questions: QuestionSeed[] = [
  {
    title: "Kartu Anggota Perpustakaan",
    description:
      "Buat kartu anggota perpustakaan sederhana.\n\nInput: nama.\nNilai tetap: perpustakaan = \"Perpustakaan Sekolah\".\n\nCetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
perpustakaan = "Perpustakaan Sekolah"
print("KARTU ANGGOTA PERPUSTAKAAN")
print("Nama:", nama)
print("Perpustakaan:", perpustakaan)
print("Terima kasih")`,
    expectedOutput: `KARTU ANGGOTA PERPUSTAKAAN
Nama: Budi
Perpustakaan: Perpustakaan Sekolah
Terima kasih`,
    exactInputs: 1,
    inputVariables: ["nama"],
    literalVariables: ["perpustakaan"],
    requiredVariables: ["nama", "perpustakaan"],
  },
  {
    title: "Struk Kantin Sekolah",
    description:
      "Buat struk kantin sederhana.\n\nInput: menu.\nNilai tetap: kantin = \"Kantin Sekolah\".\n\nCetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.",
    solutionCode: `menu = input()
kantin = "Kantin Sekolah"
print("STRUK KANTIN")
print("Menu:", menu)
print("Tempat:", kantin)
print("Terima kasih")`,
    expectedOutput: `STRUK KANTIN
Menu: Nasi Goreng
Tempat: Kantin Sekolah
Terima kasih`,
    exactInputs: 1,
    inputVariables: ["menu"],
    literalVariables: ["kantin"],
    requiredVariables: ["menu", "kantin"],
  },
  {
    title: "Tiket Museum",
    description:
      "Buat tiket museum sederhana.\n\nInput: pengunjung.\nNilai tetap: museum = \"Museum Sejarah\".\n\nCetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.",
    solutionCode: `pengunjung = input()
museum = "Museum Sejarah"
print("TIKET MUSEUM")
print("Pengunjung:", pengunjung)
print("Museum:", museum)
print("Selamat belajar")`,
    expectedOutput: `TIKET MUSEUM
Pengunjung: Raka
Museum: Museum Sejarah
Selamat belajar`,
    exactInputs: 1,
    inputVariables: ["pengunjung"],
    literalVariables: ["museum"],
    requiredVariables: ["pengunjung", "museum"],
  },
  {
    title: "Label Buku Perpustakaan",
    description:
      "Buat label buku sederhana.\n\nInput: judul.\nNilai tetap: rak = \"Rak A-03\".\n\nCetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.",
    solutionCode: `judul = input()
rak = "Rak A-03"
print("LABEL BUKU")
print("Judul:", judul)
print("Rak:", rak)
print("Simpan label ini.")`,
    expectedOutput: `LABEL BUKU
Judul: Laskar Pelangi
Rak: Rak A-03
Simpan label ini.`,
    exactInputs: 1,
    inputVariables: ["judul"],
    literalVariables: ["rak"],
    requiredVariables: ["judul", "rak"],
  },
  {
    title: "Bukti Peminjaman Buku",
    description:
      "Buat bukti peminjaman buku sederhana.\n\nInput: judul.\nNilai tetap: status = \"Dipinjam\".\n\nCetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.",
    solutionCode: `judul = input()
status = "Dipinjam"
print("BUKTI PEMINJAMAN BUKU")
print("Judul:", judul)
print("Status:", status)
print("Kembalikan tepat waktu.")`,
    expectedOutput: `BUKTI PEMINJAMAN BUKU
Judul: Matematika Dasar
Status: Dipinjam
Kembalikan tepat waktu.`,
    exactInputs: 1,
    inputVariables: ["judul"],
    literalVariables: ["status"],
    requiredVariables: ["judul", "status"],
  },
  {
    title: "Kartu Ujian Sekolah",
    description:
      "Buat kartu peserta ujian.\n\nInput berurutan: nama, kelas, nomor peserta.\nNilai tetap: mapel = \"Informatika\", ruang = \"Lab Komputer\".\nNomor peserta tetap ditulis sebagai teks agar nol di depan tidak hilang.\n\nCetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
kelas = input()
nomor = input()
mapel = "Informatika"
ruang = "Lab Komputer"
print("KARTU UJIAN")
print("Nama:", nama)
print("Kelas:", kelas)
print("Nomor:", nomor)
print("Mata Pelajaran:", mapel)
print("Ruang:", ruang)`,
    expectedOutput: `KARTU UJIAN
Nama: Nadia
Kelas: X IPA 2
Nomor: 07
Mata Pelajaran: Informatika
Ruang: Lab Komputer`,
    exactInputs: 3,
    inputVariables: ["nama", "kelas", "nomor"],
    literalVariables: ["mapel", "ruang"],
    requiredVariables: ["nama", "kelas", "nomor", "mapel", "ruang"],
  },
  {
    title: "Slip Tabungan Sekolah",
    description:
      "Buat slip tabungan sekolah.\n\nInput berurutan: nama, setoran, saldo akhir.\nNilai tetap: saldo_awal = \"50000\", bank = \"Bank Sekolah\".\nSemua input dibaca sebagai teks, tanpa mengubah tipe data.\n\nCetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
setoran = input()
saldo_akhir = input()
saldo_awal = "50000"
bank = "Bank Sekolah"
print("SLIP TABUNGAN")
print("Nama:", nama)
print("Setoran: Rp", setoran)
print("Saldo Awal: Rp", saldo_awal)
print("Saldo Akhir: Rp", saldo_akhir)
print("Bank:", bank)`,
    expectedOutput: `SLIP TABUNGAN
Nama: Fajar
Setoran: Rp 25000
Saldo Awal: Rp 50000
Saldo Akhir: Rp 75000
Bank: Bank Sekolah`,
    exactInputs: 3,
    inputVariables: ["nama", "setoran", "saldo_akhir"],
    literalVariables: ["saldo_awal", "bank"],
    requiredVariables: [
      "nama",
      "setoran",
      "saldo_awal",
      "saldo_akhir",
      "bank",
    ],
  },
  {
    title: "Nota Laundry",
    description:
      "Buat nota laundry.\n\nInput berurutan: nama pelanggan, berat cucian, total pembayaran.\nNilai tetap: harga_per_kg = \"7000\", laundry = \"Laundry Bersih\".\nSemua input dibaca sebagai teks, tanpa mengubah tipe data.\n\nCetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
berat = input()
total = input()
harga_per_kg = "7000"
laundry = "Laundry Bersih"
print("NOTA LAUNDRY")
print("Nama:", nama)
print("Berat:", berat, "kg")
print("Harga per kg: Rp", harga_per_kg)
print("Total: Rp", total)
print("Laundry:", laundry)`,
    expectedOutput: `NOTA LAUNDRY
Nama: Putri
Berat: 4 kg
Harga per kg: Rp 7000
Total: Rp 28000
Laundry: Laundry Bersih`,
    exactInputs: 3,
    inputVariables: ["nama", "berat", "total"],
    literalVariables: ["harga_per_kg", "laundry"],
    requiredVariables: [
      "nama",
      "berat",
      "harga_per_kg",
      "total",
      "laundry",
    ],
  },
  {
    title: "Tiket Parkir Sekolah",
    description:
      "Buat tiket parkir.\n\nInput berurutan: nama, durasi parkir, total pembayaran.\nNilai tetap: tarif = \"2000\", lokasi = \"Parkir Sekolah\".\nSemua input dibaca sebagai teks, tanpa mengubah tipe data.\n\nCetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
durasi = input()
total = input()
tarif = "2000"
lokasi = "Parkir Sekolah"
print("TIKET PARKIR")
print("Nama:", nama)
print("Durasi:", durasi, "jam")
print("Tarif: Rp", tarif)
print("Total: Rp", total)
print("Lokasi:", lokasi)`,
    expectedOutput: `TIKET PARKIR
Nama: Bayu
Durasi: 3 jam
Tarif: Rp 2000
Total: Rp 6000
Lokasi: Parkir Sekolah`,
    exactInputs: 3,
    inputVariables: ["nama", "durasi", "total"],
    literalVariables: ["tarif", "lokasi"],
    requiredVariables: ["nama", "durasi", "tarif", "total", "lokasi"],
  },
  {
    title: "Reservasi Lab Komputer",
    description:
      "Buat bukti reservasi laboratorium.\n\nInput berurutan: nama, kelas, alat yang dipinjam.\nNilai tetap: lab = \"Lab Komputer 1\", tanggal = \"24 November 2026\".\n\nCetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
kelas = input()
alat = input()
lab = "Lab Komputer 1"
tanggal = "24 November 2026"
print("RESERVASI LAB")
print("Nama:", nama)
print("Kelas:", kelas)
print("Alat:", alat)
print("Lab:", lab)
print("Tanggal:", tanggal)`,
    expectedOutput: `RESERVASI LAB
Nama: Adit
Kelas: XI TKJ 1
Alat: Mikroskop
Lab: Lab Komputer 1
Tanggal: 24 November 2026`,
    exactInputs: 3,
    inputVariables: ["nama", "kelas", "alat"],
    literalVariables: ["lab", "tanggal"],
    requiredVariables: ["nama", "kelas", "alat", "lab", "tanggal"],
  },
  {
    title: "Kartu Kontrol Komputer",
    description:
      "Buat kartu kontrol pemakaian komputer.\n\nInput berurutan: nama, nomor komputer.\nNilai tetap: lab = \"Lab TIK\", petugas = \"Pak Andi\".\nNomor komputer tetap ditulis sebagai teks agar nol di depan tidak hilang.\n\nCetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
komputer = input()
lab = "Lab TIK"
petugas = "Pak Andi"
print("KARTU KONTROL KOMPUTER")
print("Nama:", nama)
print("Komputer:", komputer)
print("Lab:", lab)
print("Petugas:", petugas)`,
    expectedOutput: `KARTU KONTROL KOMPUTER
Nama: Rina
Komputer: 05
Lab: Lab TIK
Petugas: Pak Andi`,
    exactInputs: 2,
    inputVariables: ["nama", "komputer"],
    literalVariables: ["lab", "petugas"],
    requiredVariables: ["nama", "komputer", "lab", "petugas"],
  },
  {
    title: "Slip SPP",
    description:
      "Buat slip pembayaran SPP.\n\nInput berurutan: nama, kelas, nominal pembayaran.\nNilai tetap: bulan = \"November\", sekolah = \"SMA Negeri 1\".\nSemua input dibaca sebagai teks, tanpa mengubah tipe data.\n\nCetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
kelas = input()
nominal = input()
bulan = "November"
sekolah = "SMA Negeri 1"
print("SLIP SPP")
print("Nama:", nama)
print("Kelas:", kelas)
print("Bulan:", bulan)
print("Nominal: Rp", nominal)
print("Sekolah:", sekolah)`,
    expectedOutput: `SLIP SPP
Nama: Salsa
Kelas: XI IPS 1
Bulan: November
Nominal: Rp 350000
Sekolah: SMA Negeri 1`,
    exactInputs: 3,
    inputVariables: ["nama", "kelas", "nominal"],
    literalVariables: ["bulan", "sekolah"],
    requiredVariables: ["nama", "kelas", "nominal", "bulan", "sekolah"],
  },
  {
    title: "Label Inventaris",
    description:
      "Buat label inventaris barang sekolah.\n\nInput berurutan: nama alat, jumlah barang.\nNilai tetap: lokasi = \"Gudang Sekolah\", kode = \"INV-2026\".\nSemua input dibaca sebagai teks, tanpa mengubah tipe data.\n\nCetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `alat = input()
jumlah = input()
lokasi = "Gudang Sekolah"
kode = "INV-2026"
print("LABEL INVENTARIS")
print("Alat:", alat)
print("Jumlah:", jumlah)
print("Lokasi:", lokasi)
print("Kode:", kode)`,
    expectedOutput: `LABEL INVENTARIS
Alat: Proyektor
Jumlah: 2
Lokasi: Gudang Sekolah
Kode: INV-2026`,
    exactInputs: 2,
    inputVariables: ["alat", "jumlah"],
    literalVariables: ["lokasi", "kode"],
    requiredVariables: ["alat", "jumlah", "lokasi", "kode"],
  },
  {
    title: "Nota Fotokopi",
    description:
      "Buat nota fotokopi dengan garis pembatas.\n\nInput berurutan: nama, jumlah lembar, total pembayaran.\nNilai tetap: harga_per_lembar = \"300\", tempat = \"Fotokopi Sekolah\".\nSemua input dibaca sebagai teks, tanpa mengubah tipe data.\n\nGunakan contoh input berikut agar output sesuai target:\nDimas\n12\n3600\n\nTampilkan garis = dan - seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
lembar = input()
total = input()
harga_per_lembar = "300"
tempat = "Fotokopi Sekolah"
print("=" * 40)
print("           NOTA FOTOKOPI")
print("=" * 40)
print(f"Nama             : {nama}")
print(f"Lembar           : {lembar}")
print(f"Harga per lembar : Rp {harga_per_lembar}")
print(f"Total            : Rp {total}")
print("-" * 40)
print(f"Tempat           : {tempat}")
print("-" * 40)
print("Terima kasih.")
print("=" * 40)`,
    expectedOutput: `========================================
           NOTA FOTOKOPI
========================================
Nama             : Dimas
Lembar           : 12
Harga per lembar : Rp 300
Total            : Rp 3600
----------------------------------------
Tempat           : Fotokopi Sekolah
----------------------------------------
Terima kasih.
========================================`,
    exactInputs: 3,
    inputVariables: ["nama", "lembar", "total"],
    literalVariables: ["harga_per_lembar", "tempat"],
    requiredVariables: [
      "nama",
      "lembar",
      "harga_per_lembar",
      "total",
      "tempat",
    ],
  },
  {
    title: "Bukti Pengembalian Alat",
    description:
      "Buat bukti pengembalian alat praktik dengan garis pembatas.\n\nInput berurutan: nama, alat, kondisi alat.\nNilai tetap: tanggal = \"25 November 2026\", petugas = \"Bu Sari\".\nSemua input dibaca sebagai teks, tanpa mengubah tipe data.\n\nGunakan contoh input berikut agar output sesuai target:\nNabila\nMikroskop\nBaik\n\nTampilkan garis = dan - seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
alat = input()
kondisi = input()
tanggal = "25 November 2026"
petugas = "Bu Sari"
print("=" * 40)
print("     BUKTI PENGEMBALIAN ALAT")
print("=" * 40)
print(f"Nama      : {nama}")
print(f"Alat      : {alat}")
print(f"Kondisi   : {kondisi}")
print(f"Tanggal   : {tanggal}")
print(f"Petugas   : {petugas}")
print("-" * 40)
print("Alat sudah dikembalikan dalam kondisi baik.")
print("=" * 40)`,
    expectedOutput: `========================================
     BUKTI PENGEMBALIAN ALAT
========================================
Nama      : Nabila
Alat      : Mikroskop
Kondisi   : Baik
Tanggal   : 25 November 2026
Petugas   : Bu Sari
----------------------------------------
Alat sudah dikembalikan dalam kondisi baik.
========================================`,
    exactInputs: 3,
    inputVariables: ["nama", "alat", "kondisi"],
    literalVariables: ["tanggal", "petugas"],
    requiredVariables: ["nama", "alat", "kondisi", "tanggal", "petugas"],
  },
  {
    title: "Kartu Lomba",
    description:
      "Buat kartu peserta lomba dengan garis pembatas.\n\nInput berurutan: nama, kelas, nama lomba.\nNilai tetap: sekolah = \"SMK Negeri 2\", tanggal = \"26 November 2026\".\nSemua input dibaca sebagai teks, tanpa mengubah tipe data.\n\nGunakan contoh input berikut agar output sesuai target:\nZahra\nXI RPL 1\nCoding\n\nTampilkan garis = dan - seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
kelas = input()
lomba = input()
sekolah = "SMK Negeri 2"
tanggal = "26 November 2026"
print("=" * 40)
print("              KARTU LOMBA")
print("=" * 40)
print(f"Nama    : {nama}")
print(f"Kelas   : {kelas}")
print(f"Lomba   : {lomba}")
print(f"Sekolah : {sekolah}")
print(f"Tanggal : {tanggal}")
print("-" * 40)
print("Simpan kartu ini selama perlombaan.")
print("=" * 40)`,
    expectedOutput: `========================================
              KARTU LOMBA
========================================
Nama    : Zahra
Kelas   : XI RPL 1
Lomba   : Coding
Sekolah : SMK Negeri 2
Tanggal : 26 November 2026
----------------------------------------
Simpan kartu ini selama perlombaan.
========================================`,
    exactInputs: 3,
    inputVariables: ["nama", "kelas", "lomba"],
    literalVariables: ["sekolah", "tanggal"],
    requiredVariables: ["nama", "kelas", "lomba", "sekolah", "tanggal"],
  },
  {
    title: "Nota Pembelian Buku",
    description:
      "Buat nota pembelian buku dengan garis pembatas.\n\nInput berurutan: nama pembeli, judul buku, jumlah buku, total pembayaran.\nNilai tetap: harga = \"45000\", toko = \"Toko Buku Cerdas\".\nSemua input dibaca sebagai teks, tanpa mengubah tipe data.\n\nGunakan contoh input berikut agar output sesuai target:\nRizky\nPython untuk Pemula\n2\n90000\n\nTampilkan garis = dan - seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.",
    solutionCode: `nama = input()
judul = input()
jumlah = input()
total = input()
harga = "45000"
toko = "Toko Buku Cerdas"
print("=" * 40)
print("        NOTA PEMBELIAN BUKU")
print("=" * 40)
print(f"Nama    : {nama}")
print(f"Judul   : {judul}")
print(f"Jumlah  : {jumlah}")
print(f"Harga   : Rp {harga}")
print(f"Total   : Rp {total}")
print("-" * 40)
print(f"Toko    : {toko}")
print("-" * 40)
print("Terima kasih.")
print("=" * 40)`,
    expectedOutput: `========================================
        NOTA PEMBELIAN BUKU
========================================
Nama    : Rizky
Judul   : Python untuk Pemula
Jumlah  : 2
Harga   : Rp 45000
Total   : Rp 90000
----------------------------------------
Toko    : Toko Buku Cerdas
----------------------------------------
Terima kasih.
========================================`,
    exactInputs: 4,
    inputVariables: ["nama", "judul", "jumlah", "total"],
    literalVariables: ["harga", "toko"],
    requiredVariables: ["nama", "judul", "jumlah", "harga", "total", "toko"],
  },
  {
    title: "Label Perlengkapan Siswa",
    description:
      "Buatlah program Python untuk mencetak label perlengkapan siswa.\n\nProgram meminta tiga data secara berurutan menggunakan input():\n1. Nama\n2. Kelas\n3. Nomor meja\n\nTentukan dua data tetap langsung di dalam kode (bukan input):\nbarang = \"Peralatan Praktik\"\nruang = \"Ruang 12\"\n\nSemua input dibaca sebagai teks.\n\nGunakan contoh input berikut agar output sesuai target:\nKevin\nX TKJ 2\n14\n\nKetentuan:\n- Minimal 5 variabel: nama, kelas, nomor_meja, barang, ruang.\n- Tepat 3 input().\n- Variabel nama, kelas, dan nomor_meja harus dibuat dari input() dan dipakai di dalam print(). Jangan menulis nilai input langsung sebagai teks.\n- Minimal 14 print() dan 14 baris output tidak kosong.\n- Tampilkan judul LABEL PERLENGKAPAN SISWA, garis pembatas, ketentuan 3 poin, dan pesan penutup.\n- Dilarang menggunakan for, while, if, atau else.",
    solutionCode: `nama = input()
kelas = input()
nomor_meja = input()
barang = "Peralatan Praktik"
ruang = "Ruang 12"
print("=" * 40)
print("        LABEL PERLENGKAPAN SISWA")
print("=" * 40)
print(f"Nama       : {nama}")
print(f"Kelas      : {kelas}")
print(f"Nomor Meja : {nomor_meja}")
print(f"Barang     : {barang}")
print(f"Ruang      : {ruang}")
print("-" * 40)
print("      KETENTUAN PENGGUNAAN")
print("-" * 40)
print("1. Tempel label pada perlengkapan.")
print("2. Jangan memindahkan barang tanpa izin.")
print("3. Kembalikan barang setelah digunakan.")
print("-" * 40)
print("Simpan label ini sebagai tanda pemakaian.")
print("=" * 40)`,
    expectedOutput: `========================================
        LABEL PERLENGKAPAN SISWA
========================================
Nama       : Kevin
Kelas      : X TKJ 2
Nomor Meja : 14
Barang     : Peralatan Praktik
Ruang      : Ruang 12
----------------------------------------
      KETENTUAN PENGGUNAAN
----------------------------------------
1. Tempel label pada perlengkapan.
2. Jangan memindahkan barang tanpa izin.
3. Kembalikan barang setelah digunakan.
----------------------------------------
Simpan label ini sebagai tanda pemakaian.
========================================`,
    exactInputs: 3,
    inputVariables: ["nama", "kelas", "nomor_meja"],
    literalVariables: ["barang", "ruang"],
    requiredVariables: ["nama", "kelas", "nomor_meja", "barang", "ruang"],
    minPrints: 14,
    minOutputLines: 14,
  },
  {
    title: "Bukti Rapor",
    description:
      "Buatlah program Python untuk mencetak bukti penerimaan rapor.\n\nProgram meminta tiga data secara berurutan menggunakan input():\n1. Nama\n2. Kelas\n3. Semester\n\nTentukan dua data tetap langsung di dalam kode (bukan input):\nwali = \"Pak Hasan\"\nsekolah = \"SMA Negeri 1\"\n\nSemua input dibaca sebagai teks.\n\nGunakan contoh input berikut agar output sesuai target:\nAlya\nXI IPA 1\nGanjil\n\nKetentuan:\n- Minimal 5 variabel: nama, kelas, semester, wali, sekolah.\n- Tepat 3 input().\n- Variabel nama, kelas, dan semester harus dibuat dari input() dan dipakai di dalam print(). Jangan menulis nilai input langsung sebagai teks.\n- Minimal 14 print() dan 14 baris output tidak kosong.\n- Tampilkan judul BUKTI PENERIMAAN RAPOR, garis pembatas, ketentuan 3 poin, dan pesan penutup.\n- Dilarang menggunakan for, while, if, atau else.",
    solutionCode: `nama = input()
kelas = input()
semester = input()
wali = "Pak Hasan"
sekolah = "SMA Negeri 1"
print("=" * 40)
print("    BUKTI PENERIMAAN RAPOR")
print("=" * 40)
print(f"Nama       : {nama}")
print(f"Kelas      : {kelas}")
print(f"Semester   : {semester}")
print(f"Wali Kelas : {wali}")
print(f"Sekolah    : {sekolah}")
print("-" * 40)
print("    KETENTUAN PENGAMBILAN RAPOR")
print("-" * 40)
print("1. Rapor diambil oleh siswa atau wali.")
print("2. Periksa identitas dan nilai dengan teliti.")
print("3. Simpan rapor dengan baik.")
print("-" * 40)
print("Rapor ini sah tanpa perlu tanda tangan basah.")
print("=" * 40)`,
    expectedOutput: `========================================
    BUKTI PENERIMAAN RAPOR
========================================
Nama       : Alya
Kelas      : XI IPA 1
Semester   : Ganjil
Wali Kelas : Pak Hasan
Sekolah    : SMA Negeri 1
----------------------------------------
    KETENTUAN PENGAMBILAN RAPOR
----------------------------------------
1. Rapor diambil oleh siswa atau wali.
2. Periksa identitas dan nilai dengan teliti.
3. Simpan rapor dengan baik.
----------------------------------------
Rapor ini sah tanpa perlu tanda tangan basah.
========================================`,
    exactInputs: 3,
    inputVariables: ["nama", "kelas", "semester"],
    literalVariables: ["wali", "sekolah"],
    requiredVariables: ["nama", "kelas", "semester", "wali", "sekolah"],
    minPrints: 14,
    minOutputLines: 14,
  },
  {
    title: "Sertifikat Mini",
    description:
      "Buatlah program Python untuk mencetak sertifikat mini siswa berprestasi.\n\nProgram meminta tiga data secara berurutan menggunakan input():\n1. Nama\n2. Kelas\n3. Prestasi\n\nTentukan dua data tetap langsung di dalam kode (bukan input):\nsekolah = \"SMK Negeri 2\"\ntanggal = \"27 November 2026\"\n\nSemua input dibaca sebagai teks.\n\nGunakan contoh input berikut agar output sesuai target:\nCitra\nXI RPL 1\nJuara 1 Coding\n\nKetentuan:\n- Minimal 5 variabel: nama, kelas, prestasi, sekolah, tanggal.\n- Tepat 3 input().\n- Variabel nama, kelas, dan prestasi harus dibuat dari input() dan dipakai di dalam print(). Jangan menulis nilai input langsung sebagai teks.\n- Minimal 14 print() dan 14 baris output tidak kosong.\n- Tampilkan judul SERTIFIKAT MINI SISWA BERPRESTASI, garis pembatas, pesan 3 poin, dan kalimat penutup.\n- Dilarang menggunakan for, while, if, atau else.",
    solutionCode: `nama = input()
kelas = input()
prestasi = input()
sekolah = "SMK Negeri 2"
tanggal = "27 November 2026"
print("=" * 40)
print("   SERTIFIKAT MINI SISWA BERPRESTASI")
print("=" * 40)
print(f"Nama       : {nama}")
print(f"Kelas      : {kelas}")
print(f"Prestasi   : {prestasi}")
print(f"Sekolah    : {sekolah}")
print(f"Tanggal    : {tanggal}")
print("-" * 40)
print("        PESAN UNTUK PENERIMA")
print("-" * 40)
print("1. Terus belajar dan berkarya.")
print("2. Jaga semangat dan kedisiplinan.")
print("3. Bagikan ilmu kepada teman.")
print("-" * 40)
print("Selamat atas prestasi yang diraih.")
print("=" * 40)`,
    expectedOutput: `========================================
   SERTIFIKAT MINI SISWA BERPRESTASI
========================================
Nama       : Citra
Kelas      : XI RPL 1
Prestasi   : Juara 1 Coding
Sekolah    : SMK Negeri 2
Tanggal    : 27 November 2026
----------------------------------------
        PESAN UNTUK PENERIMA
----------------------------------------
1. Terus belajar dan berkarya.
2. Jaga semangat dan kedisiplinan.
3. Bagikan ilmu kepada teman.
----------------------------------------
Selamat atas prestasi yang diraih.
========================================`,
    exactInputs: 3,
    inputVariables: ["nama", "kelas", "prestasi"],
    literalVariables: ["sekolah", "tanggal"],
    requiredVariables: ["nama", "kelas", "prestasi", "sekolah", "tanggal"],
    minPrints: 14,
    minOutputLines: 14,
  },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString, max: 1 });
const db = drizzle(pool);

function countPrintCalls(code: string): number {
  return (code.match(/\bprint\s*\(/g) ?? []).length;
}

function dueAtSevenDays(): Date {
  const jakartaOffset = 7 * 60 * 60 * 1000;
  const jakartaNow = new Date(Date.now() + jakartaOffset);
  const dueUtc = Date.UTC(
    jakartaNow.getUTCFullYear(),
    jakartaNow.getUTCMonth(),
    jakartaNow.getUTCDate() + 7,
    23,
    59,
    0,
    0,
  );
  return new Date(dueUtc - jakartaOffset);
}

async function main() {
  const title = "Pengganti Uprak";
  const [existing] = await db
    .select({ id: tugas.id })
    .from(tugas)
    .where(eq(tugas.title, title))
    .limit(1);

  let tugasId: number;

  if (existing) {
    tugasId = existing.id;
    console.log(`Tugas "${title}" sudah ada (id ${tugasId}), soal dilewati.`);
    console.log("Hapus tugas lama dulu jika ingin membuat ulang seluruh soal.");
    return;
  }

  const [created] = await db
    .insert(tugas)
    .values({
      title,
      description:
        "Kerjakan 20 soal coding. Setiap soal bernilai 5 poin sehingga nilai total 100. Setelah soal selesai, kumpulkan tautan video tugas dari TikTok atau Instagram. Akun TikTok/Instagram harus publik (tidak dikunci). Video wajib diisi tetapi tidak menambah nilai. Nilai akhir muncul setelah seluruh soal 5/5 dan video terkumpul. Jeda 5 menit berlaku setiap 10 percobaan pada soal yang sama. Semua input dibaca sebagai teks, tanpa konversi tipe data.",
      jenis: "tugas",
      targetType: "siswa",
      starterCode: "",
      expectedOutput: "",
      solutionCode: "",
      maxScore: 100,
      maxAttempts: 20,
      minScore: 100,
      repeatUntilPass: true,
      structureRules: null,
      structureWeight: 40,
      blockCopyPaste: false,
      manuallyClosed: false,
      requireGps: false,
      linkRequired: true,
      dueAt: dueAtSevenDays(),
    })
    .returning({ id: tugas.id });

  tugasId = created.id;

  await db.insert(tugasQuestions).values(
    questions.map((question, index) => ({
      tugasId,
      orderNo: index + 1,
      title: question.title,
      description: question.description,
      starterCode: "# Tulis kodemu di sini\n",
      expectedOutput: question.expectedOutput,
      solutionCode: question.solutionCode,
      maxScore: 5,
      structureRules: {
        enabled: true,
        exactInputs: question.exactInputs,
        minPrints:
          question.minPrints ?? countPrintCalls(question.solutionCode),
        minOutputLines:
          question.minOutputLines ??
          question.expectedOutput.split("\n").length,
        requiredVariables: question.requiredVariables,
        inputVariables: question.inputVariables,
        literalVariables: question.literalVariables,
        forbidLoops: true,
        forbidConditionals: true,
      },
      structureWeight: 40,
    })),
  );

  console.log(`Tugas "${title}" dibuat dengan id ${tugasId}.`);
  console.log(`${questions.length} soal berhasil ditambahkan.`);
}

export { questions };

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}
