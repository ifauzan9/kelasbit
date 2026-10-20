# Catatan Produksi (cPanel)

Portal ini berjalan di **hosting cPanel** dengan **Setup Node.js App**
(Passenger) dan **PostgreSQL**, bukan lagi Vercel + Supabase.

## Alur

```
GitHub  →  cPanel (Node.js App)  →  PostgreSQL cPanel
                                 →  filesystem hosting (berkas tugas)
```

- **Node.js App** — menjalankan `server.js` lewat Passenger.
- **PostgreSQL** — database utama (tanpa RLS; akses dikelola kode).
- **Filesystem** — berkas tugas siswa disimpan di folder `UPLOAD_DIR`.

## Struktur Startup

Next.js tidak punya `server.js` sendiri, jadi proyek memakai file `server.js`
di root. Ini berarti folder `public/`, `.next/`, dan `node_modules/` tetap di
tempatnya dan tidak perlu disalin ulang setiap build.

`package.json` → `"start": "node server.js"`.

## Environment Variables

Diisi di **cPanel → Setup Node.js App → Environment Variables**.

| Nama | Wajib? | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | `postgresql://user:pass@localhost:5432/nama_db` (lihat PostgreSQL Databases). |
| `DATABASE_SSL` | Opsional | `true` bila host DB memaksa SSL. Lokal cPanel biasanya `false`. |
| `GURU_SESSION_SECRET` | Ya | Acak minimal 32 karakter untuk cookie sesi guru. |
| `SISWA_SESSION_SECRET` | Ya | Acak minimal 32 karakter untuk cookie sesi siswa. |
| `UPLOAD_DIR` | Ya | Folder berkas tugas, mis. `/home/USER/berkas-tugas`. Harus di luar `public/`. |
| `MAINTENANCE_MODE` | Opsional | `1` = tampilkan halaman maintenance. |

Catatan:
- Perubahan env var **baru berlaku setelah Restart** aplikasi di cPanel.
- Mengubah secret sesi membuat semua pengguna yang sedang login logout.

## Deploy

Alur lengkap ada di **`PANDUAN-DEPLOY.md`**. Ringkasnya:

```powershell
# Di laptop
.\deploy.ps1 -Pesan "Deskripsi perubahan"
```

Lalu di cPanel: upload `next-build.zip` → Extract di folder `kelasbit` →
Terminal (`git pull`, `chmod -R u+rwX .next`) → **Setup Node.js App → Restart**.

### Kenapa build dilakukan di laptop

Hosting ini memakai glibc lama (CentOS 7), sehingga binary native Turbopack/SWC
gagal dimuat. Next.js otomatis jatuh ke WASM dan build di server bisa memakan
puluhan menit. Build lokal selesai dalam ~15 detik dan hasilnya hanya ~2 MB.

### Build langsung di server (tidak disarankan)

```bash
cd ~/kelasbit
npm ci
npm run build
```

`npm run build` sudah memakai `--webpack` karena Turbopack tidak tersedia di
platform ini. Toolchain tetap memakai SWC WASM, jadi build bisa 20–40 menit.

Catatan npm: hosting menyetel `omit=dev` secara global sehingga
devDependencies terbuang dan build gagal (`Cannot find module
'@tailwindcss/postcss'`). File `.npmrc` di root proyek menimpa setelan itu
(`include=dev`); jangan dihapus.

## Update Database

Skema ada di `schema-cpanel.sql` (bukan `schema.sql`). Jalankan lewat
cPanel Terminal dengan `psql`:

```bash
psql -h 127.0.0.200 -p 5432 -U ktimmgvh_portal -d ktimmgvh_kelasbit -f schema-cpanel.sql
```

Jangan pakai kotak SQL phpPgAdmin: ia membungkus input dengan
`SELECT COUNT(*) AS total FROM (...)` sehingga `create table` gagal.

Skrip ditulis idempoten (`create table if not exists`, `add column if not
exists`, `create index if not exists`), jadi aman dijalankan berulang setiap
deploy yang membawa perubahan skema.

## Membuat Akun Guru

Akun guru disimpan di tabel `guru_accounts` (bukan Supabase Auth):

```bash
node scripts/buat-akun-guru.mjs <username> <password>
```

Skrip membaca `DATABASE_URL` dari environment atau `.env.local`/`.env`.
Menjalankan ulang dengan username yang sama akan mengatur ulang password.

## Troubleshooting

| Gejala | Kemungkinan penyebab |
| --- | --- |
| Halaman 500 / "DATABASE_URL belum diisi" | Env `DATABASE_URL` belum diisi atau belum Restart. |
| Login guru selalu gagal | Tabel `guru_accounts` kosong atau `GURU_SESSION_SECRET` belum diisi. |
| Upload tugas gagal | Folder `UPLOAD_DIR` tidak ada / tidak writable. |
| Aset CSS hilang | `npm run build` belum dijalankan setelah update / `.next` belum di-extract. |
| Perubahan env tidak berefek | Belum Restart aplikasi. |
| Halaman login siswa kosong (dropdown tanpa data) | Query gagal karena skema belum dijalankan ulang / DB tidak bisa dihubungi; cek log Passenger. |
