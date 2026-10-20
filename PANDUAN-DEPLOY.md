# Panduan Deploy ke cPanel

Panduan langkah demi langkah untuk mengunggah hasil pengembangan dari laptop ke
hosting `kelasbit.my.id`.

Untuk gambaran arsitektur dan env var, lihat `CATATAN-PRODUKSI.md`.

---

## Kenapa alurnya begini

Hosting ini memakai CentOS 7 dengan glibc lama. Binary native Next.js
(Turbopack dan SWC) butuh glibc 2.29, jadi gagal dimuat. Next.js lalu jatuh ke
WASM, yang **jalan tetapi sangat lambat**: build bisa 20-40 menit.

Karena itu pembagian tugasnya:

| Di laptop | Di hosting |
| --- | --- |
| Menulis kode | Menjalankan aplikasi |
| `npm run build` (cepat, ~15 detik) | Menerima hasil build |
| Membuat `next-build.zip` (~2 MB) | Extract, chmod, Restart |

`node_modules` **tidak** perlu di-upload ulang kecuali ada dependensi baru.

---

## Ringkasan sekali lihat

```
LAPTOP                          HOSTING (cPanel)
------                          ----------------
1. .\deploy.ps1 -Pesan "..."
   -> build + zip + push
                                2. File Manager: upload next-build.zip
                                3. Extract di folder kelasbit
                                4. Terminal: git pull, chmod, cek BUILD_ID
                                5. Setup Node.js App: Restart
                                6. Uji di browser
```

---

## Langkah 1 - Siapkan paket di laptop

Buka PowerShell di folder proyek:

```powershell
cd C:\ngoding\kelasbit
.\deploy.ps1
```

Skrip akan:

1. Menjalankan `npx tsc --noEmit` - berhenti kalau ada error TypeScript
2. Menjalankan `npx eslint src` - berhenti kalau ada masalah lint
3. `npm run build` dari kondisi bersih
4. Membuang `.next/cache`, `.next/trace`, `.next/dev` (tidak dipakai Passenger)
5. Membuat `next-build.zip`
6. Menampilkan `BUILD_ID` yang harus cocok nanti di hosting

Hasil yang benar:

```
=== Paket deploy siap ===
  BUILD_ID : _3p6iHQFQLNVI-MxqCwGo
  ZIP      : C:\ngoding\kelasbit\next-build.zip (1.79 MB)
```

### Sekalian commit dan push

```powershell
.\deploy.ps1 -Pesan "Tambah filter kelas di rekap nilai"
```

Dengan `-Pesan`, skrip juga melakukan `git add -A`, `git commit`, dan
`git push`.

### Kalau ingin melewati pemeriksaan

```powershell
.\deploy.ps1 -LewatiCek
```

Hanya untuk keadaan mendesak - risiko besar memasukkan error ke produksi.

### Kalau PowerShell menolak menjalankan skrip

```
deploy.ps1 cannot be loaded because running scripts is disabled
```

Jalankan sekali per sesi:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

## Langkah 2 - Upload ZIP ke cPanel

1. Masuk **cPanel**
2. Buka **File Manager**
3. Masuk folder `kelasbit` (yaitu `/home/ktimmgvh/kelasbit`)
4. Klik **Upload** (ikon di toolbar)
5. Pilih `C:\ngoding\kelasbit\next-build.zip`, tunggu sampai 100%
6. Kembali ke daftar file

> Nama file sengaja **tanpa titik di depan** supaya tidak tersembunyi di File
> Manager.

---

## Langkah 3 - Extract

1. Klik kanan `next-build.zip` -> **Extract**
2. Pastikan tujuan adalah folder saat ini (`/home/ktimmgvh/kelasbit`), bukan
   subfolder
3. Setujui bila diminta menimpa file
4. Hasilnya: folder `.next` terisi ulang

**Pastikan tidak terbentuk `.next/.next`.** Kalau terjadi, hapus yang di dalam:

```bash
rm -rf ~/kelasbit/.next/.next
```

---

## Langkah 4 - Perbaiki izin dan verifikasi

Buka **Terminal** di cPanel:

```bash
cd ~/kelasbit

# Extract lewat File Manager sering menghilangkan izin baca.
chmod -R u+rwX .next
find .next -type d ! -perm -u+r -exec chmod 755 {} \;
find .next -type f ! -perm -u+r -exec chmod 644 {} \;

# Harus sama dengan BUILD_ID yang ditampilkan skrip deploy.
cat .next/BUILD_ID

# Bersihkan ZIP.
rm -f next-build.zip
```

Cek tidak ada lagi "Permission denied":

```bash
du -sh .next
```

Harapan: sekitar **6 MB**, tanpa pesan error.

---

## Langkah 5 - Sinkronkan kode sumber

Kalau kamu memakai `-Pesan` saat deploy, kode di hosting juga perlu diperbarui:

```bash
cd ~/kelasbit
git pull
```

### Kalau ada dependensi baru di `package.json`

```bash
npm ci
```

File `.npmrc` di proyek sudah memastikan devDependencies ikut terpasang.
**Jangan dihapus** - hosting menyetel `omit=dev` secara global dan build akan
gagal tanpanya.

### Kalau ada perubahan skema database

Jalankan ulang skema (idempoten, aman diulang):

```bash
cd ~/kelasbit
psql -h 127.0.0.200 -p 5432 -U ktimmgvh_portal -d ktimmgvh_kelasbit -f schema-cpanel.sql
```

### Kalau ada env var baru

Isi di **dua tempat**:

1. `~/kelasbit/.env.local` - untuk skrip `node scripts/*.mjs`
2. cPanel -> **Setup Node.js App** -> **Environment Variables** - untuk Passenger

---

## Langkah 6 - Restart aplikasi

cPanel -> **Setup Node.js App** -> aplikasi `kelasbit` -> **Restart**.

Tanpa Restart, perubahan tidak berlaku.

---

## Langkah 7 - Uji

Buka `https://kelasbit.my.id/login`.

Uji cepat yang mencakup bagian paling rawan:

| Yang diuji | Langkah |
| --- | --- |
| Halaman tampil normal | Buka `/login` dan `/login-siswa` |
| Aset CSS/JS termuat | Halaman tidak polos tanpa style |
| Sesi guru | Login, buka `/guru` |
| Database | Buka `/guru/kelas` - daftar kelas muncul |
| Filesystem | Upload lampiran tugas, lalu `find ~/berkas-kelasbit -type f` |

---

## Kalau ada masalah

Ambil log:

```bash
tail -40 ~/kelasbit/stderr.log 2>/dev/null \
  || tail -40 ~/logs/passenger.log 2>/dev/null \
  || ls ~/kelasbit/*.log
```

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| Error 500 setelah deploy | Izin file rusak | Ulangi langkah `chmod` |
| Tampilan lama masih muncul | Belum Restart | Langkah 6 |
| `Cannot find module` | Dependensi baru belum dipasang | `npm ci` |
| `column ... does not exist` | Skema belum dijalankan | Langkah 5 |
| CSS hilang, halaman polos | `.next/static` tidak ter-extract | Extract ulang ZIP |
| `BUILD_ID` beda dengan skrip | ZIP lama yang ter-upload | Ulangi dari langkah 2 |
| Upload tugas gagal | `UPLOAD_DIR` salah / tidak writable | `mkdir -p ~/berkas-kelasbit && chmod 755 ~/berkas-kelasbit` |

---

## Mengembalikan versi sebelumnya

Sebelum extract ZIP baru, kalau ingin aman, simpan dulu build lama:

```bash
cd ~/kelasbit
mv .next .next-lama
```

Kalau build baru bermasalah:

```bash
cd ~/kelasbit
rm -rf .next
mv .next-lama .next
```

Lalu Restart. Hapus `.next-lama` setelah yakin build baru stabil.

---

## Yang TIDAK boleh di-upload

- `node_modules` - dipasang di hosting lewat `npm ci`
- `.next/dev` - sisa `npm run dev`, bisa 1-2 GB
- `.env.local` dan file `.env*` lain - sudah di-`.gitignore`, isinya rahasia
- `next-build.zip` - hanya alat transfer, hapus setelah extract

Semua di atas sudah ditangani `.gitignore` dan skrip deploy.
