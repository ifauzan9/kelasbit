BEGIN;

INSERT INTO tugas (
  title, description, jenis, target_type, starter_code, expected_output, solution_code,
  max_score, max_attempts, min_score, repeat_until_pass, structure_rules,
  structure_weight, block_copy_paste, manually_closed, require_gps, link_required, due_at
)
SELECT
  'Pengganti Uprak', 'Kerjakan 20 soal coding. Setiap soal bernilai 5 poin sehingga nilai total 100. Setelah soal selesai, kumpulkan tautan video tugas dari TikTok atau Instagram. Akun TikTok/Instagram harus publik (tidak dikunci). Video wajib diisi tetapi tidak menambah nilai. Nilai akhir muncul setelah seluruh soal 5/5 dan video terkumpul. Jeda 5 menit berlaku setiap 10 percobaan pada soal yang sama. Semua input dibaca sebagai teks, tanpa konversi tipe data.', 'tugas',
  'siswa', '', '', '',
  100, 20, 100, true, NULL,
  40, false, false, false, true,
  (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') + interval '7 days 23 hours 59 minutes') AT TIME ZONE 'Asia/Jakarta'
WHERE NOT EXISTS (SELECT 1 FROM tugas WHERE title = 'Pengganti Uprak');

DO $$
DECLARE
  v_tugas_id integer;
BEGIN
  SELECT id INTO v_tugas_id FROM tugas WHERE title = 'Pengganti Uprak' ORDER BY id LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM tugas_questions WHERE tugas_id = v_tugas_id) THEN
    INSERT INTO tugas_questions (
      tugas_id, order_no, title, description, starter_code, expected_output,
      solution_code, max_score, structure_rules, structure_weight
    ) VALUES
      (v_tugas_id, 1, 'Kartu Anggota Perpustakaan', 'Buat kartu anggota perpustakaan sederhana.

Input: nama.
Nilai tetap: perpustakaan = "Perpustakaan Sekolah".

Cetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'KARTU ANGGOTA PERPUSTAKAAN
Nama: Budi
Perpustakaan: Perpustakaan Sekolah
Terima kasih',
       'nama = input()
perpustakaan = "Perpustakaan Sekolah"
print("KARTU ANGGOTA PERPUSTAKAAN")
print("Nama:", nama)
print("Perpustakaan:", perpustakaan)
print("Terima kasih")', 5, '{"enabled":true,"minPrints":4,"exactInputs":1,"forbidLoops":true,"inputVariables":["nama"],"minOutputLines":4,"literalVariables":["perpustakaan"],"requiredVariables":["nama","perpustakaan"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 2, 'Struk Kantin Sekolah', 'Buat struk kantin sederhana.

Input: menu.
Nilai tetap: kantin = "Kantin Sekolah".

Cetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'STRUK KANTIN
Menu: Nasi Goreng
Tempat: Kantin Sekolah
Terima kasih',
       'menu = input()
kantin = "Kantin Sekolah"
print("STRUK KANTIN")
print("Menu:", menu)
print("Tempat:", kantin)
print("Terima kasih")', 5, '{"enabled":true,"minPrints":4,"exactInputs":1,"forbidLoops":true,"inputVariables":["menu"],"minOutputLines":4,"literalVariables":["kantin"],"requiredVariables":["menu","kantin"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 3, 'Tiket Museum', 'Buat tiket museum sederhana.

Input: pengunjung.
Nilai tetap: museum = "Museum Sejarah".

Cetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'TIKET MUSEUM
Pengunjung: Raka
Museum: Museum Sejarah
Selamat belajar',
       'pengunjung = input()
museum = "Museum Sejarah"
print("TIKET MUSEUM")
print("Pengunjung:", pengunjung)
print("Museum:", museum)
print("Selamat belajar")', 5, '{"enabled":true,"minPrints":4,"exactInputs":1,"forbidLoops":true,"inputVariables":["pengunjung"],"minOutputLines":4,"literalVariables":["museum"],"requiredVariables":["pengunjung","museum"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 4, 'Label Buku Perpustakaan', 'Buat label buku sederhana.

Input: judul.
Nilai tetap: rak = "Rak A-03".

Cetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'LABEL BUKU
Judul: Laskar Pelangi
Rak: Rak A-03
Simpan label ini.',
       'judul = input()
rak = "Rak A-03"
print("LABEL BUKU")
print("Judul:", judul)
print("Rak:", rak)
print("Simpan label ini.")', 5, '{"enabled":true,"minPrints":4,"exactInputs":1,"forbidLoops":true,"inputVariables":["judul"],"minOutputLines":4,"literalVariables":["rak"],"requiredVariables":["judul","rak"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 5, 'Bukti Peminjaman Buku', 'Buat bukti peminjaman buku sederhana.

Input: judul.
Nilai tetap: status = "Dipinjam".

Cetak 4 baris seperti contoh. Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'BUKTI PEMINJAMAN BUKU
Judul: Matematika Dasar
Status: Dipinjam
Kembalikan tepat waktu.',
       'judul = input()
status = "Dipinjam"
print("BUKTI PEMINJAMAN BUKU")
print("Judul:", judul)
print("Status:", status)
print("Kembalikan tepat waktu.")', 5, '{"enabled":true,"minPrints":4,"exactInputs":1,"forbidLoops":true,"inputVariables":["judul"],"minOutputLines":4,"literalVariables":["status"],"requiredVariables":["judul","status"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 6, 'Kartu Ujian Sekolah', 'Buat kartu peserta ujian.

Input berurutan: nama, kelas, nomor peserta.
Nilai tetap: mapel = "Informatika", ruang = "Lab Komputer".
Nomor peserta tetap ditulis sebagai teks agar nol di depan tidak hilang.

Cetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'KARTU UJIAN
Nama: Nadia
Kelas: X IPA 2
Nomor: 07
Mata Pelajaran: Informatika
Ruang: Lab Komputer',
       'nama = input()
kelas = input()
nomor = input()
mapel = "Informatika"
ruang = "Lab Komputer"
print("KARTU UJIAN")
print("Nama:", nama)
print("Kelas:", kelas)
print("Nomor:", nomor)
print("Mata Pelajaran:", mapel)
print("Ruang:", ruang)', 5, '{"enabled":true,"minPrints":6,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","kelas","nomor"],"minOutputLines":6,"literalVariables":["mapel","ruang"],"requiredVariables":["nama","kelas","nomor","mapel","ruang"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 7, 'Slip Tabungan Sekolah', 'Buat slip tabungan sekolah.

Input berurutan: nama, setoran, saldo akhir.
Nilai tetap: saldo_awal = "50000", bank = "Bank Sekolah".
Semua input dibaca sebagai teks, tanpa mengubah tipe data.

Cetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'SLIP TABUNGAN
Nama: Fajar
Setoran: Rp 25000
Saldo Awal: Rp 50000
Saldo Akhir: Rp 75000
Bank: Bank Sekolah',
       'nama = input()
setoran = input()
saldo_akhir = input()
saldo_awal = "50000"
bank = "Bank Sekolah"
print("SLIP TABUNGAN")
print("Nama:", nama)
print("Setoran: Rp", setoran)
print("Saldo Awal: Rp", saldo_awal)
print("Saldo Akhir: Rp", saldo_akhir)
print("Bank:", bank)', 5, '{"enabled":true,"minPrints":6,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","setoran","saldo_akhir"],"minOutputLines":6,"literalVariables":["saldo_awal","bank"],"requiredVariables":["nama","setoran","saldo_awal","saldo_akhir","bank"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 8, 'Nota Laundry', 'Buat nota laundry.

Input berurutan: nama pelanggan, berat cucian, total pembayaran.
Nilai tetap: harga_per_kg = "7000", laundry = "Laundry Bersih".
Semua input dibaca sebagai teks, tanpa mengubah tipe data.

Cetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'NOTA LAUNDRY
Nama: Putri
Berat: 4 kg
Harga per kg: Rp 7000
Total: Rp 28000
Laundry: Laundry Bersih',
       'nama = input()
berat = input()
total = input()
harga_per_kg = "7000"
laundry = "Laundry Bersih"
print("NOTA LAUNDRY")
print("Nama:", nama)
print("Berat:", berat, "kg")
print("Harga per kg: Rp", harga_per_kg)
print("Total: Rp", total)
print("Laundry:", laundry)', 5, '{"enabled":true,"minPrints":6,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","berat","total"],"minOutputLines":6,"literalVariables":["harga_per_kg","laundry"],"requiredVariables":["nama","berat","harga_per_kg","total","laundry"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 9, 'Tiket Parkir Sekolah', 'Buat tiket parkir.

Input berurutan: nama, durasi parkir, total pembayaran.
Nilai tetap: tarif = "2000", lokasi = "Parkir Sekolah".
Semua input dibaca sebagai teks, tanpa mengubah tipe data.

Cetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'TIKET PARKIR
Nama: Bayu
Durasi: 3 jam
Tarif: Rp 2000
Total: Rp 6000
Lokasi: Parkir Sekolah',
       'nama = input()
durasi = input()
total = input()
tarif = "2000"
lokasi = "Parkir Sekolah"
print("TIKET PARKIR")
print("Nama:", nama)
print("Durasi:", durasi, "jam")
print("Tarif: Rp", tarif)
print("Total: Rp", total)
print("Lokasi:", lokasi)', 5, '{"enabled":true,"minPrints":6,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","durasi","total"],"minOutputLines":6,"literalVariables":["tarif","lokasi"],"requiredVariables":["nama","durasi","tarif","total","lokasi"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 10, 'Reservasi Lab Komputer', 'Buat bukti reservasi laboratorium.

Input berurutan: nama, kelas, alat yang dipinjam.
Nilai tetap: lab = "Lab Komputer 1", tanggal = "24 November 2026".

Cetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'RESERVASI LAB
Nama: Adit
Kelas: XI TKJ 1
Alat: Mikroskop
Lab: Lab Komputer 1
Tanggal: 24 November 2026',
       'nama = input()
kelas = input()
alat = input()
lab = "Lab Komputer 1"
tanggal = "24 November 2026"
print("RESERVASI LAB")
print("Nama:", nama)
print("Kelas:", kelas)
print("Alat:", alat)
print("Lab:", lab)
print("Tanggal:", tanggal)', 5, '{"enabled":true,"minPrints":6,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","kelas","alat"],"minOutputLines":6,"literalVariables":["lab","tanggal"],"requiredVariables":["nama","kelas","alat","lab","tanggal"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 11, 'Kartu Kontrol Komputer', 'Buat kartu kontrol pemakaian komputer.

Input berurutan: nama, nomor komputer.
Nilai tetap: lab = "Lab TIK", petugas = "Pak Andi".
Nomor komputer tetap ditulis sebagai teks agar nol di depan tidak hilang.

Cetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'KARTU KONTROL KOMPUTER
Nama: Rina
Komputer: 05
Lab: Lab TIK
Petugas: Pak Andi',
       'nama = input()
komputer = input()
lab = "Lab TIK"
petugas = "Pak Andi"
print("KARTU KONTROL KOMPUTER")
print("Nama:", nama)
print("Komputer:", komputer)
print("Lab:", lab)
print("Petugas:", petugas)', 5, '{"enabled":true,"minPrints":5,"exactInputs":2,"forbidLoops":true,"inputVariables":["nama","komputer"],"minOutputLines":5,"literalVariables":["lab","petugas"],"requiredVariables":["nama","komputer","lab","petugas"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 12, 'Slip SPP', 'Buat slip pembayaran SPP.

Input berurutan: nama, kelas, nominal pembayaran.
Nilai tetap: bulan = "November", sekolah = "SMA Negeri 1".
Semua input dibaca sebagai teks, tanpa mengubah tipe data.

Cetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'SLIP SPP
Nama: Salsa
Kelas: XI IPS 1
Bulan: November
Nominal: Rp 350000
Sekolah: SMA Negeri 1',
       'nama = input()
kelas = input()
nominal = input()
bulan = "November"
sekolah = "SMA Negeri 1"
print("SLIP SPP")
print("Nama:", nama)
print("Kelas:", kelas)
print("Bulan:", bulan)
print("Nominal: Rp", nominal)
print("Sekolah:", sekolah)', 5, '{"enabled":true,"minPrints":6,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","kelas","nominal"],"minOutputLines":6,"literalVariables":["bulan","sekolah"],"requiredVariables":["nama","kelas","nominal","bulan","sekolah"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 13, 'Label Inventaris', 'Buat label inventaris barang sekolah.

Input berurutan: nama alat, jumlah barang.
Nilai tetap: lokasi = "Gudang Sekolah", kode = "INV-2026".
Semua input dibaca sebagai teks, tanpa mengubah tipe data.

Cetak output persis seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', 'LABEL INVENTARIS
Alat: Proyektor
Jumlah: 2
Lokasi: Gudang Sekolah
Kode: INV-2026',
       'alat = input()
jumlah = input()
lokasi = "Gudang Sekolah"
kode = "INV-2026"
print("LABEL INVENTARIS")
print("Alat:", alat)
print("Jumlah:", jumlah)
print("Lokasi:", lokasi)
print("Kode:", kode)', 5, '{"enabled":true,"minPrints":5,"exactInputs":2,"forbidLoops":true,"inputVariables":["alat","jumlah"],"minOutputLines":5,"literalVariables":["lokasi","kode"],"requiredVariables":["alat","jumlah","lokasi","kode"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 14, 'Nota Fotokopi', 'Buat nota fotokopi dengan garis pembatas.

Input berurutan: nama, jumlah lembar, total pembayaran.
Nilai tetap: harga_per_lembar = "300", tempat = "Fotokopi Sekolah".
Semua input dibaca sebagai teks, tanpa mengubah tipe data.

Gunakan contoh input berikut agar output sesuai target:
Dimas
12
3600

Tampilkan garis = dan - seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', '========================================
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
========================================',
       'nama = input()
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
print("=" * 40)', 5, '{"enabled":true,"minPrints":12,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","lembar","total"],"minOutputLines":12,"literalVariables":["harga_per_lembar","tempat"],"requiredVariables":["nama","lembar","harga_per_lembar","total","tempat"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 15, 'Bukti Pengembalian Alat', 'Buat bukti pengembalian alat praktik dengan garis pembatas.

Input berurutan: nama, alat, kondisi alat.
Nilai tetap: tanggal = "25 November 2026", petugas = "Bu Sari".
Semua input dibaca sebagai teks, tanpa mengubah tipe data.

Gunakan contoh input berikut agar output sesuai target:
Nabila
Mikroskop
Baik

Tampilkan garis = dan - seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', '========================================
     BUKTI PENGEMBALIAN ALAT
========================================
Nama      : Nabila
Alat      : Mikroskop
Kondisi   : Baik
Tanggal   : 25 November 2026
Petugas   : Bu Sari
----------------------------------------
Alat sudah dikembalikan dalam kondisi baik.
========================================',
       'nama = input()
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
print("=" * 40)', 5, '{"enabled":true,"minPrints":11,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","alat","kondisi"],"minOutputLines":11,"literalVariables":["tanggal","petugas"],"requiredVariables":["nama","alat","kondisi","tanggal","petugas"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 16, 'Kartu Lomba', 'Buat kartu peserta lomba dengan garis pembatas.

Input berurutan: nama, kelas, nama lomba.
Nilai tetap: sekolah = "SMK Negeri 2", tanggal = "26 November 2026".
Semua input dibaca sebagai teks, tanpa mengubah tipe data.

Gunakan contoh input berikut agar output sesuai target:
Zahra
XI RPL 1
Coding

Tampilkan garis = dan - seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', '========================================
              KARTU LOMBA
========================================
Nama    : Zahra
Kelas   : XI RPL 1
Lomba   : Coding
Sekolah : SMK Negeri 2
Tanggal : 26 November 2026
----------------------------------------
Simpan kartu ini selama perlombaan.
========================================',
       'nama = input()
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
print("=" * 40)', 5, '{"enabled":true,"minPrints":11,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","kelas","lomba"],"minOutputLines":11,"literalVariables":["sekolah","tanggal"],"requiredVariables":["nama","kelas","lomba","sekolah","tanggal"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 17, 'Nota Pembelian Buku', 'Buat nota pembelian buku dengan garis pembatas.

Input berurutan: nama pembeli, judul buku, jumlah buku, total pembayaran.
Nilai tetap: harga = "45000", toko = "Toko Buku Cerdas".
Semua input dibaca sebagai teks, tanpa mengubah tipe data.

Gunakan contoh input berikut agar output sesuai target:
Rizky
Python untuk Pemula
2
90000

Tampilkan garis = dan - seperti contoh. Gunakan semua variabel di dalam print(). Jangan memakai for, while, if, atau else.',
       '# Tulis kodemu di sini
', '========================================
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
========================================',
       'nama = input()
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
print("=" * 40)', 5, '{"enabled":true,"minPrints":13,"exactInputs":4,"forbidLoops":true,"inputVariables":["nama","judul","jumlah","total"],"minOutputLines":13,"literalVariables":["harga","toko"],"requiredVariables":["nama","judul","jumlah","harga","total","toko"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 18, 'Label Perlengkapan Siswa', 'Buatlah program Python untuk mencetak label perlengkapan siswa.

Program meminta tiga data secara berurutan menggunakan input():
1. Nama
2. Kelas
3. Nomor meja

Tentukan dua data tetap langsung di dalam kode (bukan input):
barang = "Peralatan Praktik"
ruang = "Ruang 12"

Semua input dibaca sebagai teks.

Gunakan contoh input berikut agar output sesuai target:
Kevin
X TKJ 2
14

Ketentuan:
- Minimal 5 variabel: nama, kelas, nomor_meja, barang, ruang.
- Tepat 3 input().
- Variabel nama, kelas, dan nomor_meja harus dibuat dari input() dan dipakai di dalam print(). Jangan menulis nilai input langsung sebagai teks.
- Minimal 14 print() dan 14 baris output tidak kosong.
- Tampilkan judul LABEL PERLENGKAPAN SISWA, garis pembatas, ketentuan 3 poin, dan pesan penutup.
- Dilarang menggunakan for, while, if, atau else.',
       '# Tulis kodemu di sini
', '========================================
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
========================================',
       'nama = input()
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
print("=" * 40)', 5, '{"enabled":true,"minPrints":14,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","kelas","nomor_meja"],"minOutputLines":14,"literalVariables":["barang","ruang"],"requiredVariables":["nama","kelas","nomor_meja","barang","ruang"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 19, 'Bukti Rapor', 'Buatlah program Python untuk mencetak bukti penerimaan rapor.

Program meminta tiga data secara berurutan menggunakan input():
1. Nama
2. Kelas
3. Semester

Tentukan dua data tetap langsung di dalam kode (bukan input):
wali = "Pak Hasan"
sekolah = "SMA Negeri 1"

Semua input dibaca sebagai teks.

Gunakan contoh input berikut agar output sesuai target:
Alya
XI IPA 1
Ganjil

Ketentuan:
- Minimal 5 variabel: nama, kelas, semester, wali, sekolah.
- Tepat 3 input().
- Variabel nama, kelas, dan semester harus dibuat dari input() dan dipakai di dalam print(). Jangan menulis nilai input langsung sebagai teks.
- Minimal 14 print() dan 14 baris output tidak kosong.
- Tampilkan judul BUKTI PENERIMAAN RAPOR, garis pembatas, ketentuan 3 poin, dan pesan penutup.
- Dilarang menggunakan for, while, if, atau else.',
       '# Tulis kodemu di sini
', '========================================
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
========================================',
       'nama = input()
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
print("=" * 40)', 5, '{"enabled":true,"minPrints":14,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","kelas","semester"],"minOutputLines":14,"literalVariables":["wali","sekolah"],"requiredVariables":["nama","kelas","semester","wali","sekolah"],"forbidConditionals":true}'::jsonb, 40),
      (v_tugas_id, 20, 'Sertifikat Mini', 'Buatlah program Python untuk mencetak sertifikat mini siswa berprestasi.

Program meminta tiga data secara berurutan menggunakan input():
1. Nama
2. Kelas
3. Prestasi

Tentukan dua data tetap langsung di dalam kode (bukan input):
sekolah = "SMK Negeri 2"
tanggal = "27 November 2026"

Semua input dibaca sebagai teks.

Gunakan contoh input berikut agar output sesuai target:
Citra
XI RPL 1
Juara 1 Coding

Ketentuan:
- Minimal 5 variabel: nama, kelas, prestasi, sekolah, tanggal.
- Tepat 3 input().
- Variabel nama, kelas, dan prestasi harus dibuat dari input() dan dipakai di dalam print(). Jangan menulis nilai input langsung sebagai teks.
- Minimal 14 print() dan 14 baris output tidak kosong.
- Tampilkan judul SERTIFIKAT MINI SISWA BERPRESTASI, garis pembatas, pesan 3 poin, dan kalimat penutup.
- Dilarang menggunakan for, while, if, atau else.',
       '# Tulis kodemu di sini
', '========================================
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
========================================',
       'nama = input()
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
print("=" * 40)', 5, '{"enabled":true,"minPrints":14,"exactInputs":3,"forbidLoops":true,"inputVariables":["nama","kelas","prestasi"],"minOutputLines":14,"literalVariables":["sekolah","tanggal"],"requiredVariables":["nama","kelas","prestasi","sekolah","tanggal"],"forbidConditionals":true}'::jsonb, 40);
  END IF;
END $$;

COMMIT;