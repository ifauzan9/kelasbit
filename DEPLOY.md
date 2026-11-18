# Checklist Upload Fitur Baru ke cPanel

Dokumen ini wajib dibaca sebelum build/upload ke produksi. Ditulis untuk mencegah
tiga kesalahan yang paling mahal: DB produksi tercemar data uji, migrasi merusak data
lama, dan kredensial lokal ikut terupload.

---

## 0. Aturan emas

1. **Database lokal tidak pernah ikut terupload.** Lokal = container Docker
   `kelasbit-db` (volume `db-data`). Produksi = PostgreSQL di cPanel. Dua instance
   terpisah; deploy hanya mengirim kode (`.next/standalone`).
2. **Jangan pernah `npm run db:push` ke produksi.** Perintah itu menyamakan schema
   secara langsung dan bisa menghapus kolom/data. Produksi hanya lewat migration.
3. **Jangan pernah import dump DB lokal ke cPanel.** Itu satu-satunya cara data uji
   ikut ke produksi.
4. **Backup DB produksi sebelum migrasi apa pun.** Tanpa backup, jangan lanjut.
5. **Jangan upload `.env`.** Produksi memakai Environment Variables di
   *Setup Node.js App*.
6. **Hati-hati saat mengisi `DATABASE_URL` produksi.** Selama env itu aktif di
   terminal, semua perintah dan Server Action menulis ke produksi. Uji fitur hanya
   dengan env lokal.
7. **Jangan menaikkan `react`/`react-dom` sendirian.** Proyek ini memakai Next 15.5.29
   yang mengompilasi React 19.2; keduanya dipin `19.2.9`. Naikkan Next dan React
   bersama-sama, lalu uji ulang alur Server Action.

---

## 1. Sebelum build

- [ ] Matikan `npm run dev` — build dan dev memakai `.next` yang sama; kalau barengan,
      dev server balas 500.
- [ ] Pastikan `NODE_ENV` **kosong** saat build. Jangan set `production` (bikin dev
      server rusak setelahnya) dan jangan set `development` — prerender `/login/siswa`
      gagal dengan `Cannot read properties of null (reading 'useContext')`.
      PowerShell: `Remove-Item Env:\NODE_ENV -ErrorAction SilentlyContinue`
- [ ] `git status` — pastikan tidak ada perubahan setengah jadi / file debug.
- [ ] Baca ulang fitur yang diubah: apakah menyentuh schema, auth, atau file di `public/`?

---

## 2. Kalau fitur mengubah schema database

- [ ] `npm run db:generate` → cek file SQL baru di `drizzle/`.
- [ ] **Baca isi SQL-nya.** Tolak/tulis ulang kalau ada `DROP TABLE`, `DROP COLUMN`,
      atau perubahan tipe yang menghilangkan data.
- [ ] Uji migrasi di DB lokal yang masih punya data (`npm run db:migrate`).
- [ ] Migrasi terakhir untuk fitur siswa + kelas: `drizzle/0005_solid_paladin.sql`
      (menambah `users.kelas_id` + index, tanpa `DROP`). Jalankan **setelah** backup.
      Migrasi ini hanya menambah kolom nullable; siswa lama otomatis "tanpa kelas".
- [ ] **Backup DB produksi** (phpPgAdmin → Export, atau `pg_dump` via SSH tunnel).
- [ ] Simpan file backup dengan tanggal, mis. `backup-prod-2026-11-17.sql`.
- [ ] Migrasi lewat SSH tunnel, di terminal terpisah:

      ssh -L 5433:localhost:5432 USER@DOMAIN

      # terminal lain (PowerShell)
      $env:DATABASE_URL="postgresql://USER:PASS@localhost:5433/DB"
      npm run db:migrate

- [ ] Setelah migrasi selesai, **tutup/keluarkan env produksi** dari terminal itu.
- [ ] Jangan jalankan `npm run db:seed` ke produksi kecuali memang sengaja membuat
      akun demo. Kalau iya, ganti password demo setelahnya.

### 2b. Kalau tidak ada SSH (hanya Terminal cPanel / phpPgAdmin)

1. Cek duplikat username dulu — `0004` gagal kalau ada:

       psql -h localhost -U USER -d DB -c "select split_part(email,'@',1) as u, count(*) from users group by 1 having count(*) > 1;"

2. Upload folder `drizzle/` ke `/home/USER/apps/kelasbit/drizzle`, lalu jalankan
   berurutan dengan `-v ON_ERROR_STOP=1`:

       psql ... -f drizzle/0003_icy_johnny_blaze.sql
       psql ... -f drizzle/0004_fuzzy_sersi.sql
       psql ... -f drizzle/0005_solid_paladin.sql

3. Catat jurnal Drizzle supaya `npm run db:migrate` berikutnya tidak mengulang
   migrasi lama (`hash` = sha256 isi file SQL):

       INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES
        ('6a84a8f9fc9e3b12fc20e43d1697e15a531da2be609524afeae33bf69118eb44', 1794917966073),
        ('dbfc8de35b4ce97f685a33077e2ef17985a274329fd185d439bf80b798b1f1f8', 1794919938764),
        ('03edde9f67a0faa19e08fb3b035d09462608da650a67832cb4923b456971e307', 1794923654786);

   Cek: `select count(*) from drizzle.__drizzle_migrations;` → **6**.
   Kalau produksi ternyata belum punya tabel `drizzle.__drizzle_migrations`
   (artinya dulu migrasi dijalankan manual tanpa Drizzle), jalankan 0000–0005
   sekaligus lalu catat keenam hash di atas.

---

## 3. Cek file yang tidak boleh ikut

`npm run deploy:prepare` menyalin `public/` dan `.next/static/` ke bundle, lalu
menghapus `.env*`. Tetap verifikasi:

- [ ] `.env*` sudah tidak ada di `.next/standalone`.
- [ ] Isi `public/` bersih dari file uji (foto, PDF, hasil upload lokal).
      **Catatan:** saat ini aplikasi belum punya fitur upload file. Kalau nanti
      ditambahkan dan menyimpan ke `public/`, folder itu WAJIB dibersihkan dulu —
      kalau tidak, file uji ikut naik ke produksi.
- [ ] Tidak ada dump `.sql` lokal, `*.zip` lama, atau folder `.commandcode/` di bundle.
- [ ] `drizzle/` tidak otomatis ikut ke bundle — upload terpisah hanya kalau perlu
      migrasi lewat terminal cPanel.
- [ ] **Dependency native/external (`exceljs`)** — template import siswa memakai
      `exceljs`, yang ada di `serverExternalPackages`. Setelah `deploy:prepare`,
      pastikan folder ini ada:

      .next/standalone/node_modules/exceljs

      Kalau hilang, halaman `/guru/siswa` akan error saat import/template di produksi.
      Salin manual dari `node_modules/` kalau perlu, lalu zip ulang.

---

## 4. Build & upload

- [ ] `npm run build`
- [ ] `npm run deploy:prepare`
- [ ] Pastikan hasilnya: `.next/standalone/server.js`, `.next/standalone/.next/static/`,
      dan `public/` (kalau ada).
- [ ] Zip **isi** `.next/standalone` (bukan folder induknya) → `standalone.zip`.
      Di Windows: `tar -a -c -f standalone-<tanggal>.zip -C .next/standalone .`
      (jangan pakai *Compress-Archive* ke folder induk — `server.js` jadi tidak di root).
- [ ] **Uji zip sebelum upload**: ekstrak ke folder kosong, jalankan
      `PORT=3003 node server.js`, lalu cek `/api/health` dan `/guru/siswa/template`.
- [ ] **Simpan zip versi sebelumnya** untuk rollback, mis. `standalone-backup-2026-11-17.zip`.
- [ ] cPanel File Manager → `/home/USER/apps/kelasbit` (jangan `public_html`).
- [ ] Upload, **Extract**, pastikan `server.js` ada tepat di root folder aplikasi.
- [ ] *Setup Node.js App* → **Restart**. **Jangan** klik *Run NPM Install*
      (`node_modules` sudah ikut di bundle).

---

## 5. Verifikasi setelah naik

- [ ] `https://domainmu/api/health` → `{"status":"ok","db":true}`
- [ ] Landing page tampil normal.
- [ ] Login siswa (`siswa` / `siswa12345`) dan guru (`guru@kelasbit.id`) berhasil.
- [ ] **Smoke test fitur baru** sesuai skenario utama.
- [ ] Khusus fitur siswa: unduh template di `/guru/siswa/template`, lihat isi 3 sheet,
      lalu import 1 baris uji: setelah **Periksa File** harus muncul tabel pratinjau
      (status *Siap*/*Gagal* + alasan), dan **belum ada akun** sebelum tombol **Import**
      ditekan. Pastikan kelas ikut tersimpan. Hapus akun uji itu setelahnya (jangan
      biarkan data uji menumpuk di produksi).
- [ ] Setelah simpan/hapus di `/guru/siswa` atau `/guru/kelas`, daftar harus ikut
      berubah dalam ±1 detik tanpa reload manual. Kalau tidak berubah, cek console
      browser: pola `useRefreshOnSuccess` + `RouterNudge` bergantung pada
      `router.refresh()` di client (lihat `PROGRESS.md` → Pelajaran teknis).
- [ ] Cek data lama masih utuh (jumlah materi, daftar user).
- [ ] Cek log aplikasi di cPanel kalau ada error.

---

## 6. Rollback

1. Hapus isi folder aplikasi (hati-hati: jangan hapus `server.js` sebelum zip baru siap).
2. Extract `standalone-backup-<tanggal>.zip`.
3. **Restart** aplikasi di *Setup Node.js App*.
4. Kalau migrasi sudah sempat jalan dan merusak data: restore DB dari backup
   (phpPgAdmin → Import / `psql -f`).
5. Catat penyebabnya di `PROGRESS.md` supaya tidak terulang.

---

## 7. Lokal vs produksi — ringkasan

| Aspek | Lokal | Produksi (cPanel) |
| --- | --- | --- |
| Database | Docker `kelasbit-db`, volume `db-data` | PostgreSQL cPanel |
| Data uji | tetap di lokal, tidak dibersihkan otomatis | tidak tersentuh |
| Deploy | — | hanya kode `.next/standalone` |
| Env | `.env` lokal | Environment Variables cPanel |
| Migrasi | `npm run db:migrate` | lewat SSH tunnel / phpPgAdmin |

Reset DB lokal kalau sudah terlalu kotor:

```bash
docker compose down -v   # hapus container + volume (data hilang total)
docker compose up -d
npm run db:migrate
npm run db:seed
```

Hapus data uji tertentu tanpa reset total:

```bash
docker compose exec db psql -U kelasbit -d kelasbit
# lalu: TRUNCATE nama_tabel; / DELETE FROM ... WHERE ...;
```

atau `npm run db:studio`.

---

## 8. Cheatsheet perintah

```bash
# lokal
docker compose up -d
npm run dev
npm run db:studio

# schema berubah
npm run db:generate     # buat SQL baru di drizzle/
npm run db:migrate      # terapkan (lokal)
# baca SQL-nya, backup prod, baru migrasi ke prod lewat tunnel

# deploy
npm run build
npm run deploy:prepare
# zip isi .next/standalone → upload → extract → Restart
```
