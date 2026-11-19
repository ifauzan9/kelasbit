# Kelasbit

Next.js 15 (App Router) + PostgreSQL + Drizzle ORM, disiapkan untuk hosting **cPanel** dengan *Setup Node.js App* (Phusion Passenger).

## Stack

- Next.js 15.5 dengan `output: "standalone"`
- PostgreSQL via `pg` (node-postgres)
- Drizzle ORM + drizzle-kit
- Tailwind CSS v4
- TypeScript + ESLint

## Development lokal

Database lokal pakai Docker (Postgres 17), aplikasi Next.js tetap jalan di host.
Ini menjaga hot reload tetap cepat dan DB-nya identik dengan PostgreSQL di cPanel.

```bash
# 1. Siapkan env
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux

# 2. Nyalakan database (Docker Desktop harus running)
docker compose up -d

# 3. Install (NODE_ENV=production membuat npm melewatkan devDependencies)
npm install --include=dev

# 4. Terapkan schema
npm run db:migrate            # jalankan SQL migration di drizzle/
# atau: npm run db:push       # sinkron langsung dari schema.ts

# 5. Jalankan
npm run dev
```

- App: http://localhost:3000 (Next otomatis pindah ke 3001 bila 3000 terpakai)
- Cek koneksi DB: http://localhost:3000/api/health → `{"status":"ok","db":true}`

Perintah Docker yang sering dipakai:

```bash
docker compose ps             # status container
docker compose logs -f db     # lihat log Postgres
docker compose stop           # hentikan DB (data tetap tersimpan)
docker compose down -v        # hapus DB beserta datanya
```

Data disimpan di volume `db-data`, jadi aman saat container di-stop atau di-restart.
Kredensial default: user/password/database = `kelasbit`.

## Struktur penting

| Path | Fungsi |
| --- | --- |
| `src/app/` | App Router (halaman + API routes) |
| `src/app/api/health/route.ts` | Health check + tes koneksi PostgreSQL |
| `src/lib/db/index.ts` | Pool `pg` + instance Drizzle (lazy) |
| `src/lib/db/schema.ts` | Schema Drizzle (tabel `kelas`, `users`, `sessions`, `materi`, `login_attempts`, `login_logs`, `app_settings`) |
| `src/app/(public)/` | Halaman publik: `/`, `/login*` — memakai header/footer situs |
| `src/app/(dashboard)/` | Area dashboard siswa — memakai shell sidebar + topbar sendiri |
| `src/app/(dashboard)/siswa/page.tsx` | Dashboard siswa (banner + kartu empty state) |
| `src/app/(guru)/` | Area guru — memakai shell `GuruShell` sendiri |
| `src/app/(guru)/guru/page.tsx` | Dashboard guru (statistik + CRUD materi) |
| `src/app/(guru)/guru/kelas/page.tsx` | Manajemen kelas (nama + tahun ajaran) |
| `src/app/(guru)/guru/siswa/page.tsx` | Manajemen siswa + pembuatan akun login |
| `src/app/(guru)/guru/siswa/template/route.ts` | Unduh template import `.xlsx` (khusus guru) |
| `src/app/(guru)/guru/log-login/page.tsx` | Log login siswa: statistik, filter, pencarian, pagination, lokasi |
| `src/app/(guru)/guru/pengaturan/page.tsx` | Pengaturan aplikasi: toggle lacak lokasi login siswa |
| `src/app/(dashboard)/siswa/profil/page.tsx` | Profil siswa: info akun, edit profil, keamanan |
| `src/app/(guru)/guru/profil/page.tsx` | Profil guru: info akun, edit profil, keamanan |
| `src/lib/akun/actions.ts` | Server Actions profil: update profil, ganti password, logout semua perangkat |
| `src/lib/akun/queries.ts` | Query data profil + kelas siswa |
| `src/components/akun/` | Komponen ringkasan profil, form edit, dan form keamanan |
| `src/lib/auth/rate-limit.ts` | Rate limiting login berbasis tabel `login_attempts` |
| `src/lib/auth/login-log.ts` | Pencatatan & cleanup riwayat login siswa (tabel `login_logs`) |
| `src/lib/auth/request-info.ts` | Ambil IP dan User-Agent dari header request |
| `src/lib/guru/login-log-queries.ts` | Query log login: filter, pagination, statistik |
| `src/lib/guru/login-log-utils.ts` | Format status/alasan, lokasi, waktu WIB, dan User-Agent |
| `src/components/guru/login-log-table.tsx` | Tabel log login + pagination + link peta |
| `src/lib/auth/geolocation.ts` | Tipe status lokasi, validasi koordinat, URL Google Maps |
| `src/lib/auth/geolocation-client.ts` | Ambil lokasi browser sekali setelah login berhasil |
| `src/lib/auth/login-location.ts` | Update baris log login dengan lokasi |
| `src/app/api/login-location/route.ts` | Route POST untuk menyimpan lokasi setelah sesi aktif |
| `src/lib/settings/queries.ts` | Baca pengaturan aplikasi (toggle lokasi login) |
| `src/lib/settings/actions.ts` | Server Action toggle lokasi khusus guru |
| `src/components/guru/login-location-setting.tsx` | Kartu switch lacak lokasi login |
| `src/lib/guru/actions.ts` | Server Actions CRUD materi: tambah, ubah, hapus |
| `src/lib/guru/queries.ts` | Query daftar materi |
| `src/lib/guru/kelas-actions.ts` | Server Actions CRUD kelas: tambah, ubah, hapus |
| `src/lib/guru/kelas-queries.ts` | Query daftar kelas |
| `src/lib/guru/siswa-actions.ts` | Server Actions siswa: tambah, ubah, reset password, aktif/nonaktif, hapus, import Excel/CSV |
| `src/lib/guru/siswa-queries.ts` | Query daftar & jumlah siswa, daftar kelas + jumlah siswa |
| `src/lib/guru/siswa-utils.ts` | Username dari nama, validasi email, parser CSV, normalisasi tahun ajaran |
| `src/lib/guru/siswa-excel.ts` | Baca `.xlsx` dan bangun template 3 sheet (butuh `exceljs`) |
| `src/components/guru/materi-manager.tsx` | Form tambah materi + daftar |
| `src/components/guru/materi-row.tsx` | Baris materi: edit inline dan hapus |
| `src/components/guru/kelas-manager.tsx` | Form tambah kelas + daftar per tahun ajaran |
| `src/components/guru/kelas-row.tsx` | Baris kelas: edit inline dan hapus |
| `src/components/guru/siswa-manager.tsx` | Form tambah siswa + daftar, pencarian, filter status & kelas |
| `src/components/guru/siswa-row.tsx` | Baris siswa: edit (termasuk kelas), reset password, aktif/nonaktif, hapus |
| `src/components/guru/siswa-import.tsx` | Import Excel `.xlsx` / CSV massal + unduh kredensial |
| `src/components/guru/credential-panel.tsx` | Panel username/password sekali tampil + tombol salin |
| `src/components/guru/guru-nav.tsx` | Nav guru (menu aktif memakai `usePathname`) |
| `src/components/dashboard/dashboard-shell.tsx` | Shell dashboard: sidebar nav, topbar, profil, logout |
| `src/middleware.ts` | Redirect instan untuk halaman terlindungi dan halaman login |
| `src/components/navigation-progress.tsx` | Bar progres navigasi di atas layar |
| `src/components/center-loading.tsx` | Indikator loading terpusat (spinner + "Memuat…") |
| `src/lib/hooks/use-navigation-pending.ts` | Hook deteksi navigasi pending (dipakai kedua indikator) |
| `src/components/skeleton.tsx` | Primitif skeleton untuk status loading |
| `src/components/login-form.tsx` | Form login yang dipakai kedua role |
| `src/components/auth-card.tsx` | Kerangka kartu halaman login |
| `src/lib/auth/` | Hashing password, session cookie, Server Action login/logout |
| `scripts/seed.ts` | Membuat akun demo (`npm run db:seed`) |
| `scripts/cpanel-db-env.sh` | Helper koneksi PostgreSQL di Terminal cPanel |
| `scripts/generate-migration-journal.mjs` | Generate SQL jurnal migrasi (`npm run db:journal`) |
| `drizzle/` | SQL migration hasil `npm run db:generate` |
| `drizzle.config.ts` | Konfigurasi drizzle-kit |
| `docker-compose.yml` | PostgreSQL lokal untuk development |
| `scripts/prepare-deploy.mjs` | Menyalin `public` + `.next/static` ke bundle standalone |

Setelah mengubah schema:

```bash
npm run db:generate   # buat file SQL baru di drizzle/
```

## Autentikasi

Siswa dan guru punya halaman login serta dashboard terpisah. Sesi disimpan di tabel
`sessions` dan cookie `kelasbit_session` (httpOnly, sameSite `lax`, berlaku 7 hari).
Password di-hash dengan `scrypt` bawaan Node, jadi tidak ada dependency tambahan.

- **Siswa login memakai `username`** yang dibuat otomatis dari nama (mis. `budi.santoso`;
  kalau sudah dipakai menjadi `budi.santoso2`). Email siswa opsional.
- **Guru login memakai email.** Saat ini hanya ada satu akun guru (dibuat lewat
  `npm run db:seed`); belum ada UI untuk menambah akun guru lain.
- Akun siswa bisa dinonaktifkan dari `/guru/siswa`; akun nonaktif tidak bisa login dan
  sesinya langsung dihapus.
- Username tidak berubah saat nama siswa diedit.
- Siswa bisa punya **kelas** (relasi `users.kelas_id` → `kelas.id`). Kalau kelas dihapus,
  siswanya tetap ada dan menjadi "tanpa kelas" (`ON DELETE SET NULL`).
- Setiap pengguna punya halaman **profil** (`/siswa/profil`, `/guru/profil`) untuk mengubah
  nama, email, dan password. Email guru dipakai untuk login, sehingga perubahannya wajib
  dikonfirmasi dengan password saat ini. Username dan role tidak bisa diubah.
- Ganti password mencabut semua sesi lain; tersedia juga tombol **Keluar dari semua
  perangkat**.
- Login dibatasi **5 kegagalan per akun / 15 menit** dan **30 kegagalan per IP / 15 menit**
  (tabel `login_attempts`, identifier & IP di-hash). Login berhasil membersihkan catatan
  akun tersebut.
- Percobaan login siswa dicatat di tabel `login_logs` (berhasil, gagal, dan diblokir)
  lengkap dengan nama/kelas snapshot, IP, dan User-Agent. Guru bisa melihatnya di
  `/guru/log-login` dengan filter status/kelas/periode dan pagination.
- Log login lebih lama dari **90 hari** dibersihkan otomatis. Riwayat mulai terkumpul
  setelah fitur dipasang; tidak ada backfill login lama.
- Guru bisa mengaktifkan/menonaktifkan **lacak lokasi login siswa** di
  `/guru/pengaturan` (default **nonaktif**). Kredensial divalidasi lebih dulu; user yang
  tidak valid tidak memicu permintaan lokasi. Setelah login berhasil, browser siswa baru
  diminta izin lokasi, lalu lokasi disimpan ke log dan user diarahkan ke dashboard.
  Jika siswa menolak atau timeout, login tetap berjalan. Selama menunggu izin, tombol
  login menampilkan “Menunggu izin lokasi…”. Koordinat ditampilkan sebagai link Google
  Maps + akurasi. Fitur ini membutuhkan **HTTPS**.
- Sesi kedaluwarsa dan catatan percobaan login lebih dari 24 jam dibersihkan otomatis saat
  login berhasil atau password diganti.

| Rute | Keterangan |
| --- | --- |
| `/login` | Pemilih peran (Siswa / Guru) |
| `/login/siswa` | Form login siswa (username) |
| `/login/guru` | Form login guru (email) |
| `/siswa` | Dashboard siswa — wajib login sebagai siswa |
| `/guru` | Dashboard guru — wajib login sebagai guru |
| `/guru/kelas` | Manajemen kelas — wajib login sebagai guru |
| `/guru/siswa` | Manajemen siswa + akun login — wajib login sebagai guru |
| `/guru/siswa/template` | Unduh template import siswa `.xlsx` — wajib login sebagai guru |
| `/guru/log-login` | Log login siswa: berhasil, gagal, diblokir, filter & pagination — wajib login sebagai guru |
| `/guru/pengaturan` | Pengaturan aplikasi: toggle lacak lokasi login siswa — wajib login sebagai guru |
| `/siswa/profil` | Profil siswa: info akun, edit profil, ganti password — wajib login sebagai siswa |
| `/guru/profil` | Profil guru: info akun, edit profil, ganti password — wajib login sebagai guru |
| `/sesi` | Route handler yang mengarahkan ke dashboard sesuai role |

Status loading saat berpindah halaman:

- Bar tipis di paling atas (`NavigationProgress`) muncul seketika saat link internal diklik.
- Indikator terpusat (`CenterLoading`) berupa spinner + teks "Memuat…" di tengah layar;
  muncul setelah 200 ms agar navigasi cepat tidak berkedip.
- `loading.tsx` di setiap rute menampilkan skeleton berbentuk layout aslinya.
- Ikon panah/tombol berubah jadi spinner kecil selama navigasi (`useLinkStatus`).
- Submit form login: tombol menampilkan spinner + "Memproses…" dan indikator tengah ikut
  aktif lewat event `kelasbit:busy` sampai Server Action selesai.
- Semua animasi menyesuaikan `prefers-reduced-motion`.

Perilaku:

- Belum login → dialihkan middleware ke `/login/siswa` atau `/login/guru` (307 instan).
- Sudah login → `/login*` dialihkan ke `/sesi`, lalu ke dashboard sesuai role.
- Role tidak cocok (guru buka `/siswa`) → dialihkan ke `/sesi`, lalu dashboard role-nya.
- Login di halaman role yang salah → ditolak dengan pesan umum
  "Username atau password salah." / "Email atau password salah." (role akun tidak dibocorkan).
- Logika ada di `src/lib/auth/` (`password.ts`, `session.ts`, `actions.ts`).

Buat akun demo:

```bash
npm run db:seed
```

| Username / Email | Password | Role |
| --- | --- | --- |
| `siswa` | `siswa12345` | siswa |
| `guru@kelasbit.id` | `guru12345` | guru |

## Deploy ke cPanel

### 1. Prasyarat hosting

- Menu **Setup Node.js App** tersedia, Node.js **18.18+** (disarankan 20 atau 22).
- Menu **PostgreSQL Databases** tersedia.
- Terminal/SSH (opsional, memudahkan migrasi).

### 2. Siapkan database

Di **PostgreSQL Databases**:

1. **Create New Database** — misal `USER_kelasbit`.
2. **Create User** — simpan password-nya.
3. **Add User to Database** → pilih **ALL PRIVILEGES**.

Catat: host `localhost`, port `5432`, nama database, user, password.
Format URL: `postgresql://USER:PASSWORD@localhost:5432/DBNAME`

### 3. Build di lokal

```bash
npm install --include=dev
npm run build
npm run deploy:prepare
```

Hasil siap upload ada di `.next/standalone` dan sudah berisi:
`server.js`, `node_modules` minimal, dan `.next/static/`. Folder `public/` ikut disalin
jika ada. Script ini juga otomatis menghapus file `.env*` dari bundle supaya kredensial
lokal tidak ikut terupload.

### 4. Upload

1. Zip **isi** folder `.next/standalone` (bukan folder induknya) → `standalone.zip`.
2. cPanel **File Manager** → buat folder `/home/USER/apps/kelasbit`
   (jangan di `public_html`).
3. Upload `standalone.zip` ke folder tersebut, lalu **Extract**.
4. Pastikan `server.js` berada tepat di root `/home/USER/apps/kelasbit`.

### 5. Daftarkan aplikasi Node.js

**Setup Node.js App → Create Application**:

| Field | Nilai |
| --- | --- |
| Node.js version | 20 atau 22 |
| Application mode | Production |
| Application root | `apps/kelasbit` |
| Application URL | domain/subdomain kamu |
| Application startup file | `server.js` |

Lalu tambahkan **Environment Variables**:

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DBNAME
NODE_ENV=production
```

**Save → Restart.**
Jangan klik *Run NPM Install* — `node_modules` sudah ikut di bundle.

### 6. Jalankan migrasi

Pilih salah satu:

**A. Terminal cPanel**

```bash
for f in drizzle/000*.sql; do
  psql -h localhost -U USER_DB -d USER_DB -f "$f"
done
```

Jalankan berurutan (0000 → 0002). Folder `drizzle/` tidak ikut ke bundle standalone,
jadi upload folder itu dulu kalau memakai cara ini.

**B. phpPgAdmin** — buka database → Import → pilih file SQL dari folder `drizzle/`.

**C. Lewat SSH tunnel (disarankan)** — DB tidak perlu dibuka ke internet.

Terminal 1:

```bash
ssh -L 5433:localhost:5432 USER@DOMAIN
```

Terminal 2:

```powershell
$env:DATABASE_URL="postgresql://USER:PASS@localhost:5433/DB"
npm run db:migrate
```

**D. Remote langsung** — hanya kalau hosting mengizinkan IP kamu di PostgreSQL:

```bash
DATABASE_URL="postgresql://USER:PASS@IP_SERVER:5432/DB" npm run db:migrate
```

### 6b. Isi akun demo

DB produksi masih kosong. Lewat tunnel yang sama (terminal 1 tetap terbuka), jalankan
di terminal 2:

```powershell
$env:DATABASE_URL="postgresql://USER:PASS@localhost:5433/DB"
npm run db:seed
```

Ganti password akun demo sebelum dipakai di produksi.

### 7. Verifikasi

Buka `https://domainmu/api/health`:

```json
{ "status": "ok", "db": true }
```

Buka juga halaman utama dan pastikan UI tampil normal.

## Update aplikasi

Checklist lengkap sebelum upload fitur baru (termasuk backup DB dan rollback) ada di
[`DEPLOY.md`](./DEPLOY.md). Ringkasnya:

```bash
npm run build
npm run deploy:prepare
```

Upload ulang isi `.next/standalone` (timpa file lama), lalu **Restart** aplikasi di
*Setup Node.js App*. Kalau ada migration baru, jalankan dulu lewat SSH tunnel sebelum
restart. Untuk migrasi manual di Terminal cPanel, generate file jurnal dengan
`npm run db:journal -- --out migrasi/journal-YYYY-MM-DD.sql` lalu jalankan file itu
setelah migration baru.

## Catatan

- `next/image` diset `unoptimized` karena binary `sharp` bersifat platform-specific; build di Windows tidak kompatibel dijalankan di Linux cPanel.
- `npm run deploy:prepare` otomatis menghapus file `.env*` dari bundle standalone.
  Jangan upload `.env`; gunakan **Environment Variables** di cPanel.
- Pool database dibatasi `max: 5` karena shared hosting membatasi jumlah koneksi.
- PostgreSQL harus di `localhost` (port 5432 keluar biasanya diblokir firewall shared hosting).
- Peringatan `@next/swc-win32-x64-msvc blocked` saat build di Windows hanya memicu fallback WASM; build tetap berhasil.
- `npm audit --omit=dev` → 0 vulnerabilities. Sisa temuan hanya di dev tooling (`drizzle-kit`/`esbuild`).
- Jangan jalankan `npm run build` saat `npm run dev` masih hidup — keduanya memakai `.next`,
  dan build membuat dev server balas 500. Restart dev server setelah build.
- Jika `npm run dev` balas 500 dengan `Module parse failed: Unexpected character '@'`
  pada `globals.css`, `NODE_ENV` di environment bukan `development`. Jalankan
  `set NODE_ENV=development` (cmd) atau `$env:NODE_ENV="development"` (PowerShell).
- `npm run db:seed` memakai `--env-file=.env` karena Node tidak membaca `.env` otomatis.
