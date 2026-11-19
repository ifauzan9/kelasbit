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
- [ ] Migrasi terakhir untuk fitur lacak lokasi login: `drizzle/0008_clear_marvel_zombies.sql`
      (menambah kolom `latitude`, `longitude`, `accuracy`, `location_status` di
      `login_logs` dan membuat `app_settings`, tanpa `DROP`). Jalankan **setelah**
      backup. Toggle lokasi default nonaktif; halaman `/guru/pengaturan` membutuhkan
      tabel `app_settings`.
- [ ] Migrasi sebelumnya: `drizzle/0007_absurd_baron_zemo.sql` membuat `login_logs`;
      `drizzle/0006_smiling_titania.sql` membuat `login_attempts`;
      `drizzle/0005_solid_paladin.sql` menambah `users.kelas_id`
      + index (nullable, siswa lama otomatis "tanpa kelas").
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

2. Upload file migrasi **baru** (dan file jurnal) ke `~/migrasi/`, lalu jalankan
   **hanya file yang belum diterapkan**, satu per satu:

       psql ... -1 -v ON_ERROR_STOP=1 -f ~/migrasi/0009_NAMA_MIGRASI_BARU.sql

   **Jangan jalankan ulang migrasi yang sudah tercatat.**
   Contoh rilis 19 Nov 2026: `0006`, `0007`, `0008` (hanya jika belum ada).

3. Sinkronkan jurnal Drizzle. **Jangan menyusun hash manual**; gunakan generator
   dari lokal:

       npm run db:journal -- --out migrasi/journal-YYYY-MM-DD.sql

   Upload file jurnal ke `~/migrasi/`, lalu jalankan di cPanel:

       psql ... -1 -v ON_ERROR_STOP=1 -f ~/migrasi/journal-YYYY-MM-DD.sql
       psql ... -c "select count(*) from drizzle.__drizzle_migrations;"

   Jumlahnya harus sama dengan jumlah file `drizzle/*.sql` lokal.

   Kalau produksi belum punya `drizzle.__drizzle_migrations`, **jangan menjalankan
   semua migrasi dari nol**. Cek tabel/kolom yang sudah ada, jalankan hanya migrasi
   yang belum, lalu jalankan file jurnal hasil generator.

### 2c. Jurnal migrasi manual (tanpa drizzle-kit di produksi)

Bundle standalone tidak berisi `drizzle-kit`, jadi migrasi manual via `psql` tidak
otomatis mencatat ke `drizzle.__drizzle_migrations`. Setelah menjalankan SQL baru,
generate file jurnal dari lokal:

```powershell
npm run db:journal -- --out migrasi/journal-YYYY-MM-DD.sql
```

Upload `journal-YYYY-MM-DD.sql` ke `~/migrasi/`, lalu di cPanel:

```bash
psql -1 -v ON_ERROR_STOP=1 -f ~/migrasi/journal-YYYY-MM-DD.sql
psql -c "select count(*) from drizzle.__drizzle_migrations;"
```

File jurnal mencatat hash **semua** migrasi dan aman dijalankan berulang
(`WHERE NOT EXISTS`). Jumlah akhir harus sama dengan jumlah file `drizzle/*.sql`.

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
- [ ] Khusus fitur profil & keamanan: buka `/siswa/profil` dan `/guru/profil`, ubah nama,
      coba ganti password (pastikan sesi lain keluar dan password baru bisa dipakai), lalu
      uji tombol **Keluar dari semua perangkat**.
- [ ] Uji rate limit login: 5 kali password salah → muncul pesan blokir; login benar
      setelah jendela waktu (15 menit) harus berhasil. Jangan menguji berlebihan di akun
      guru produksi.
- [ ] Khusus fitur log login: login siswa sekali, lalu buka `/guru/log-login`. Pastikan
      baris `berhasil` muncul dengan nama, kelas, IP, perangkat, dan waktu WIB. Coba juga
      satu password salah (baris `gagal`) dan filter status/kelas/pencarian. Hapus data
      uji dari DB produksi setelahnya.
- [ ] Khusus lacak lokasi: buka `/guru/pengaturan`, pastikan default **Nonaktif**.
      Aktifkan, lalu login siswa dan uji izin lokasi **ditolak** dan **diizinkan**.
      Pastikan log sukses menampilkan “Lihat peta” atau status `ditolak`, dan login tetap
      berjalan saat izin ditolak. Nonaktifkan lagi, login siswa → status `dimatikan`.
      Fitur ini **wajib HTTPS**; tanpa HTTPS browser tidak memberi lokasi.
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
