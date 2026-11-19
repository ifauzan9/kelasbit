# Panduan Deploy ke cPanel (Kelasbit)

Langkah praktis deploy build baru ke produksi cPanel.  
**Urutan wajib:** migrasi DB dulu → baru pasang kode.

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
4. Buat zip dari isi `.next/standalone` (root zip harus langsung berisi `server.js`):
   ```powershell
   if (Test-Path standalone-YYYY-MM-DD.zip) { Remove-Item standalone-YYYY-MM-DD.zip }
   tar -a -c -f standalone-YYYY-MM-DD.zip -C .next/standalone .
   ```
5. (Opsional) Uji zip: extract ke folder kosong → set env → `node server.js` → cek `/api/health`.

**Jika ada perubahan schema DB:** jalankan `npm run db:generate`, periksa SQL di `drizzle/`, commit.

---

## 1. Upload (cPanel → File Manager)

| Dari lokal | Ke server |
|---|---|
| `standalone-YYYY-MM-DD.zip` | `/home/ktimmgvh/` |
| File migrasi baru saja (mis. `0006_*.sql`) dari folder `drizzle/` | `/home/ktimmgvh/migrasi/` (buat folder jika belum ada) |

- Jangan taruh file `.sql` di dalam folder aplikasi (hilang saat swap).
- Jangan upload `.env` (env produksi diatur di *Setup Node.js App*).

---

## 2. Backup & migrasi DB (cPanel → Terminal)

Jalankan **satu perintah per langkah** (tempel sekaligus sering terpotong). Tunggu prompt `$` sebelum lanjut.

**2.1 Koneksi DB** *(ganti `PGUSER`/`PGDATABASE` jika berbeda; cek: cPanel → PostgreSQL Databases)*:
```bash
read -r -s -p "Password DB: " PGPASSWORD; echo
```
```bash
export PGPASSWORD PGHOST=localhost PGUSER=ktimmgvh_kelasbit PGDATABASE=ktimmgvh_kelasbit
```

**2.2 Backup** *(jika gagal karena versi `pg_dump` vs server, lanjut jika data tidak kritis; cadangan bisa via phpPgAdmin Export)*:
```bash
pg_dump -Fc -f ~/backup-YYYY-MM-DD.dump && ls -lh ~/backup-YYYY-MM-DD.dump || echo "pg_dump gagal; lanjut"
```

**2.3 Jalankan migrasi baru** *(urut & sesuaikan nama file; lewati jika tidak ada migrasi baru)*:
```bash
cd ~/migrasi
```
```bash
for f in 0003_*.sql 0004_*.sql 0005_*.sql 0006_*.sql 0007_*.sql 0008_*.sql; do echo "===== $f"; psql -1 -v ON_ERROR_STOP=1 -f "$f" || { echo "STOP: $f gagal"; break; }; done
```
**Stop jika ada `ERROR`/`STOP`.**

**2.4 Verifikasi**:
```bash
psql -c "\dt"
```
```bash
psql -c "select id, name, username, is_active from users order by id limit 10;"
```

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
- Setelah stabil (2–3 hari): hapus `~/standalone-*.zip`, `~/apps/kelasbit-old`, dan `~/backup-*.dump` sesuai kebutuhan.
