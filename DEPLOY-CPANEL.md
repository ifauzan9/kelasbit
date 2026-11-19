# Panduan Deploy ke cPanel (Kelasbit)

Langkah praktis deploy build baru ke produksi cPanel.  
**Urutan wajib:** migrasi DB dulu → baru pasang kode.

## Alur deploy berikutnya (ringkas)

- [ ] `npm run build` lalu `npm run deploy:prepare`
- [ ] Jika schema berubah: `npm run db:generate`, baca SQL-nya
- [ ] Generate jurnal: `npm run db:journal -- --out migrasi/journal-YYYY-MM-DD.sql`
- [ ] Zip isi `.next/standalone` → `standalone-YYYY-MM-DD.zip`
- [ ] Upload zip aplikasi + file migrasi + jurnal ke `/home/ktimmgvh/`
- [ ] Extract file migrasi ke `~/migrasi/`
- [ ] `source ~/cpanel-db-env.sh`
- [ ] Backup DB
- [ ] Cek migrasi terakhir, jalankan **hanya file baru**
- [ ] Jalankan `journal-YYYY-MM-DD.sql`
- [ ] Verifikasi jumlah jurnal dan tabel/kolom
- [ ] Upload/swap kode, **Restart**, smoke test
- [ ] Simpan `standalone` lama dan backup sampai stabil

---

## 0. Build di komputer lokal

1. Matikan `npm run dev` (jangan jalan bersamaan dengan build).
2. Pastikan `NODE_ENV` kosong:
   ```powershell
   echo $env:NODE_ENV
   ```
3. Build & siapkan bundle:
   ```bash
   npm run build
   npm run deploy:prepare
   ```
4. **Jika schema DB berubah:** jalankan `npm run db:generate`, baca SQL baru di
   `drizzle/`, lalu generate file jurnal:
   ```powershell
   npm run db:journal -- --out migrasi/journal-YYYY-MM-DD.sql
   ```
   File ini mencatat hash **semua** migrasi dan aman dijalankan berulang.
5. Buat zip dari isi `.next/standalone` (root zip harus langsung berisi `server.js`):
   ```powershell
   if (Test-Path standalone-YYYY-MM-DD.zip) { Remove-Item standalone-YYYY-MM-DD.zip }
   tar -a -c -f standalone-YYYY-MM-DD.zip -C .next/standalone .
   ```
6. (Opsional) Uji zip: extract ke folder kosong → set env → `node server.js` → cek `/api/health`.

---

## 1. Upload (cPanel → File Manager)

| Dari lokal | Ke server |
|---|---|
| `standalone-YYYY-MM-DD.zip` | `/home/ktimmgvh/` |
| File migrasi baru dari folder `drizzle/` | `/home/ktimmgvh/migrasi/` |
| `migrasi/journal-YYYY-MM-DD.sql` | `/home/ktimmgvh/migrasi/` |

Buat zip migrasi jika perlu:

```powershell
tar -a -c -f migrasi-YYYY-MM-DD.zip -C migrasi .
```

- Jangan taruh file `.sql` di dalam folder aplikasi (hilang saat swap).
- Jangan upload `.env` (env produksi diatur di *Setup Node.js App*).

---

## 2. Backup & migrasi DB (cPanel → Terminal)

Jalankan **satu perintah per langkah** (tempel sekaligus sering terpotong). Tunggu prompt `$` sebelum lanjut.

> **Terminal cPanel refresh = env hilang.** Jika `PGUSER`/`PGPASSWORD` hilang, ulangi
> langkah koneksi di bawah. Password database tidak berubah.

**2.1 Koneksi DB** *(ganti `PGUSER`/`PGDATABASE` jika berbeda; cek: cPanel → PostgreSQL Databases)*:
```bash
read -r -s -p "Password DB: " PGPASSWORD; echo
```
```bash
export PGPASSWORD PGHOST=localhost PGUSER=ktimmgvh_kelasbit PGDATABASE=ktimmgvh_kelasbit
```

**Simpan koneksi agar tahan refresh terminal:** upload `scripts/cpanel-db-env.sh` dari repo
ke `/home/ktimmgvh/cpanel-db-env.sh`, lalu:

```bash
chmod 700 ~/cpanel-db-env.sh
source ~/cpanel-db-env.sh
```

Script akan meminta password dan mengetes koneksi. Password **tidak disimpan** di file.
Jika user/database berbeda:

```bash
PGUSER=user_lain PGDATABASE=db_lain source ~/cpanel-db-env.sh
```

**2.2 Backup** *(wajib sebelum migrasi)*:
```bash
pg_dump -Fc -f ~/backup-YYYY-MM-DD.dump
ls -lh ~/backup-YYYY-MM-DD.dump
```
Jika `pg_dump` gagal karena versi tidak cocok, gunakan **phpPgAdmin → Export**.
**Jangan lanjut migrasi tanpa backup.**

**2.3 Cek migrasi terakhir**:
```bash
psql -c "select count(*) from drizzle.__drizzle_migrations;"
```
```bash
psql -c "select hash, created_at from drizzle.__drizzle_migrations order by created_at desc limit 5;"
```

**Jangan jalankan ulang file migrasi yang sudah tercatat.** Jalankan hanya file baru dari rilis ini.

**2.4 Jalankan migrasi baru**:
```bash
cd ~/migrasi
ls -1
```
```bash
psql -1 -v ON_ERROR_STOP=1 -f ~/migrasi/0009_NAMA_MIGRASI_BARU.sql
```
Ulangi untuk setiap file baru. **Stop jika ada `ERROR`.**

**2.5 Catat jurnal migrasi**:
```bash
psql -1 -v ON_ERROR_STOP=1 -f ~/migrasi/journal-YYYY-MM-DD.sql
```
```bash
psql -c "select count(*) from drizzle.__drizzle_migrations;"
```
Jumlahnya harus sama dengan jumlah file migrasi di folder `drizzle/` lokal.

**2.6 Verifikasi**:
```bash
psql -c "\dt"
```
```bash
psql -c "select to_regclass('public.login_attempts') as login_attempts, to_regclass('public.login_logs') as login_logs, to_regclass('public.app_settings') as app_settings;"
```
```bash
psql -c "select id, name, username, is_active from users order by id limit 10;"
```

> **Jika `drizzle.__drizzle_migrations` belum ada:** jangan menjalankan `db:migrate`
> dari nol. Cek dulu tabel/kolom yang sudah ada (lihat `DEPLOY.md` bagian 2b), jalankan
> hanya migrasi yang belum, lalu jalankan file jurnal hasil `npm run db:journal`.
> Kondisi ini pernah terjadi di produksi pada 19 Nov 2026: `0000`–`0005` sudah ada
> tanpa jurnal, lalu `0006`–`0008` dijalankan dan jurnal `0000`–`0008` disinkronkan.

---

## 3. Pasang kode baru — metode swap (Terminal)

**3.1 Ekstrak & verifikasi bundle**:
```bash
cd ~
unzip -t standalone-YYYY-MM-DD.zip | tail -2
rm -rf apps/kelasbit-new
unzip -q standalone-YYYY-MM-DD.zip -d apps/kelasbit-new
```
```bash
ls -1 ~/apps/kelasbit-new
test -f ~/apps/kelasbit-new/server.js && echo "server.js OK"
test -d ~/apps/kelasbit-new/.next/static/chunks && echo "static OK"
test -f ~/apps/kelasbit-new/node_modules/exceljs/package.json && echo "exceljs OK"
test -f ~/apps/kelasbit-new/node_modules/pg/package.json && echo "pg OK"
ls ~/apps/kelasbit-new/.env* 2>/dev/null || echo "tanpa .env (benar)"
```
**Stop** jika `server.js` tidak di root, package hilang, atau ada `.env`.

**3.2 Salin file ekstra dari folder lama (jika ada)**:
```bash
ls -la ~/apps/kelasbit
cp -a ~/apps/kelasbit/.htaccess ~/apps/kelasbit-new/ 2>/dev/null || true
cp -a ~/apps/kelasbit/tmp ~/apps/kelasbit-new/ 2>/dev/null || true
```

**3.3 Swap folder**:
```bash
cd ~/apps
rm -rf kelasbit-old
mv kelasbit kelasbit-old && mv kelasbit-new kelasbit
ls -1 kelasbit | head
```

**3.4 (Opsional) hemat disk**:
```bash
rm -rf ~/apps/kelasbit/node_modules/@img/sharp-win32-x64
```

---

## 4. Restart & uji

1. cPanel → **Setup Node.js App** → aplikasi `kelasbit` → **Restart**  
   - **Jangan** klik *Run NPM Install*.  
   - Cek: Application root `apps/kelasbit`, startup `server.js`, Node 22, Production.
2. Buka `https://domainmu/api/health` → `{"status":"ok","db":true}`.
3. Smoke test: login guru → cek halaman/fitur yang berubah → aksi utama (buat/edit/hapus/import sesuai rilis).
4. Jika login loop di HTTP, aktifkan HTTPS/AutoSSL (cookie `secure`).

---

## Rollback

**Kode** (lalu Restart):
```bash
cd ~/apps && mv kelasbit kelasbit-gagal && mv kelasbit-old kelasbit
```
**DB** (hanya jika data rusak; setelah migrasi additive, kode lama biasanya masih kompatibel):
```bash
pg_restore -c --if-exists -d ktimmgvh_kelasbit ~/backup-YYYY-MM-DD.dump
```

---

## Catatan penting

- Urutan: **migrasi DB dulu, baru kode**.
- Produksi: hanya pakai file di `drizzle/` (migrate), **bukan** `db:push`; jangan import dump DB lokal.
- Jangan upload `.env`; jangan hapus/overwrite folder lama sebelum verifikasi.
- Terminal cPanel: jalankan perintah **satu per satu** jika paste multi-baris terpotong.
- **Terminal refresh menghapus env DB.** Jalankan `source ~/cpanel-db-env.sh` lagi;
  password database tidak berubah.
- **Jangan jalankan ulang migrasi lama.** Cek `drizzle.__drizzle_migrations` dulu,
  lalu jalankan hanya file baru.
- **Jurnal Drizzle** dibuat dengan `npm run db:journal -- --out migrasi/journal-YYYY-MM-DD.sql`.
  Jalankan setelah migrasi manual. File ini aman dijalankan berulang.
- Produksi sudah memiliki jurnal Drizzle sejak deploy 19 Nov 2026. Jika tabel jurnal
  hilang lagi, cek tabel/kolom dulu—jangan menjalankan `db:migrate` dari nol.
- Setelah stabil (2–3 hari): hapus `~/standalone-*.zip`, `~/apps/kelasbit-old`, dan `~/backup-*.dump` sesuai kebutuhan.
