# Status Pengerjaan

Terakhir diperbarui: 17 November 2026

## Yang sudah jadi

- Setup project: Next.js 15.5 (App Router) + Tailwind v4 + Drizzle ORM + `pg`
- Konfigurasi deploy cPanel (`output: "standalone"`, `serverExternalPackages: ["pg"]`, image unoptimized)
- Database lokal via Docker Compose (Postgres 17, container `kelasbit-db`)
- `src/lib/db/index.ts` — pool `pg` lazy + instance Drizzle
- `src/app/api/health/route.ts` — health check, terverifikasi `{"status":"ok","db":true}`
- Landing page: `src/app/page.tsx`, `src/components/site-header.tsx`, `site-footer.tsx`, `icons.tsx`, `globals.css`
- `README.md` — panduan dev lokal (Docker) + deploy cPanel
- `DEPLOY.md` — checklist upload fitur baru ke cPanel (backup DB, migrasi, rollback)
- `AGENTS.md` — aturan kerja agent, termasuk aturan keamanan deploy & database
- `scripts/prepare-deploy.mjs` — menyalin `public` + `.next/static` ke bundle standalone

### Autentikasi

- Schema: `users` (+ `password_hash`, `role`) dan tabel `sessions`
  (`src/lib/db/schema.ts`); tipe `Role = "siswa" | "guru"`
- Migration: `drizzle/0000_*.sql` (users) dan `drizzle/0001_nasty_madame_web.sql` (auth)
- `src/lib/auth/password.ts` — hashing `scrypt` bawaan Node (`salt:hash`, verifikasi `timingSafeEqual`)
- `src/lib/auth/session.ts` — session DB + cookie `kelasbit_session`
  (httpOnly, sameSite lax, 7 hari), `homePathForRole()`, `requireUser(role)`
- `src/lib/auth/actions.ts` — Server Action `login` (role dari hidden field) & `logout`
- `src/components/login-form.tsx` — satu form dipakai dua role (warna & label berbeda)
- `src/components/auth-card.tsx` — kerangka kartu halaman login + `AuthLink`
- `scripts/seed.ts` + `npm run db:seed` — akun demo:
  - `siswa` (username) / `siswa12345` (role siswa), email `siswa@kelasbit.id`
  - `guru@kelasbit.id` / `guru12345` (role guru)

### Rute

| Rute | Isi |
| --- | --- |
| `/` | Landing page |
| `/login` | Pemilih peran (Siswa / Guru) |
| `/login/siswa` | Form login siswa |
| `/login/guru` | Form login guru |
| `/siswa` | Dashboard siswa (wajib login sebagai siswa) |
| `/guru` | Dashboard guru (wajib login sebagai guru) |
| `/guru/kelas` | Manajemen kelas (wajib login sebagai guru) |
| `/guru/siswa` | Manajemen siswa + akun login (wajib login sebagai guru) |
| `/sesi` | Route handler: arahkan ke dashboard sesuai role (dipakai middleware) |
| `/api/health` | Health check + tes koneksi DB |

Aturan akses:

- Belum login dan cookie sesi tidak ada → middleware langsung 307 ke `/login/<role>`
- Sudah login buka `/login*` → middleware 307 ke `/sesi` → dashboard sesuai role
- Role salah (guru buka `/siswa`) → middleware 307 ke `/sesi` → dashboard role-nya
- Login di halaman role yang salah (mis. akun guru di `/login/siswa`) → ditolak dengan
  pesan umum "Username atau password salah." / "Email atau password salah."
  (tidak membocorkan role akun)
- `/dashboard` lama sudah dihapus; sekarang `/siswa` dan `/guru`

Middleware (`src/middleware.ts`) hanya memeriksa **keberadaan** cookie (`kelasbit_session`
dan `kelasbit_role`) supaya redirect tetap instan. Otorisasi sebenarnya tetap di server
lewat `requireUser(role)` yang memvalidasi sesi ke database.

### Dashboard siswa

- Route group `(public)` untuk halaman publik (`/`, `/login*`) dengan header/footer situs.
- Route group `(dashboard)` untuk area siswa, memakai shell sendiri lewat
  `src/components/dashboard/dashboard-shell.tsx` (sidebar nav + topbar + profil + logout).
- Route group `(guru)` untuk area guru, memakai `src/components/guru/guru-shell.tsx`.
- `/siswa` menampilkan banner sapaan dan kartu **empty state**: Materi Terbaru, Tugas Aktif,
  Jadwal Hari Ini, Progress Belajar, dan Pengumuman. Belum ada data contoh.
- Skeleton `src/app/(dashboard)/siswa/loading.tsx` meniru banner + grid kartu.
- Responsif: sidebar penuh di desktop, nav horizontal yang bisa di-scroll di mobile.

### CRUD materi (dashboard guru)

- Tabel `materi` (`id`, `title`, `description`, `subject`, `created_at`, `updated_at`)
  ditambahkan lewat migration `drizzle/0002_shallow_spot.sql`.
- Halaman `/guru` menampilkan form tambah materi (judul, mata pelajaran, deskripsi)
  dan daftar materi dengan aksi **Edit** (inline) serta **Hapus** (dengan konfirmasi).
- Server Actions: `src/lib/guru/actions.ts` (`createMateri`, `updateMateri`,
  `deleteMateri`), divalidasi di server dan dilindungi `requireUser("guru")`.
- Query: `src/lib/guru/queries.ts` (urut `created_at` terbaru).
- Komponen: `src/components/guru/materi-manager.tsx` dan `materi-row.tsx`.
- Status: create, read, update, dan delete sudah diuji end-to-end lewat browser;
  `tsc --noEmit` dan `npm run lint` bersih.

### Manajemen kelas (dashboard guru)

- Tabel `kelas` (`id`, `name`, `academic_year`, `created_at`, `updated_at`) lewat
  migration `drizzle/0003_icy_johnny_blaze.sql`. Unik per pasangan `(name, academic_year)`.
- Halaman `/guru/kelas` — form tambah kelas (nama + tahun ajaran) dan daftar kelas
  yang dikelompokkan per tahun ajaran (terbaru di atas), lengkap dengan pencarian.
- Server Actions: `src/lib/guru/kelas-actions.ts` (`createKelas`, `updateKelas`,
  `deleteKelas`), dilindungi `requireUser("guru")`; cek duplikat case-insensitive dan
  tetap menangkap unique violation `23505` sebagai jaring pengaman.
- Query: `src/lib/guru/kelas-queries.ts` (urut `academic_year` terbaru, lalu `name`,
  sekaligus menghitung jumlah siswa per kelas).
- Komponen: `src/components/guru/kelas-manager.tsx`, `kelas-row.tsx`,
  dan `guru-nav.tsx` (nav client dengan `usePathname()` supaya menu aktif akurat).
- Tahun ajaran memakai format `YYYY/YYYY` (`2026/2027`), divalidasi bahwa tahun kedua
  adalah tahun pertama + 1. Pilihan dropdown dibangkitkan otomatis dari
  `academicYearOptions()` (tahun berjalan −2 s/d +1), default `currentAcademicYear()`
  yang berganti tiap Juli.
- Setiap baris kelas menampilkan jumlah siswanya. Hapus kelas bersifat permanen dengan
  konfirmasi yang menyebutkan berapa siswa akan menjadi "tanpa kelas"; akun siswanya
  tidak dihapus (`users.kelas_id` → `ON DELETE SET NULL`).
- Status: create, read, update, delete, penolakan duplikat (case-insensitive), filter
  per tahun ajaran, pencarian, dan efek hapus kelas ke siswa sudah diuji end-to-end
  lewat browser; `tsc --noEmit`, `npm run lint`, dan `npm run build` bersih. Data uji
  sudah dihapus dari DB lokal.

### Manajemen siswa (dashboard guru)

- Kolom baru di `users`: `username` (unik, dipakai login siswa), `email` kini opsional,
  dan `is_active` (default `true`) lewat migration `drizzle/0004_fuzzy_sersi.sql`.
  Migration juga mem-backfill username akun lama (demo siswa → `siswa`).
- Relasi kelas: `users.kelas_id` (nullable) → `kelas.id` `ON DELETE SET NULL` + index,
  lewat migration `drizzle/0005_solid_paladin.sql`.
- Halaman `/guru/siswa` — statistik (total, aktif, nonaktif, tanpa kelas), form tambah
  siswa (nama, email, kelas), daftar siswa dengan pencarian, filter status, dan filter
  kelas.
- Username dibuat otomatis dari nama (`budi.santoso`; bentrok → `budi.santoso2`) dan
  tidak berubah setelah dibuat. Password awal 12 karakter acak tanpa karakter ambigu.
- Kredensial ditampilkan sekali di panel dengan tombol salin (termasuk nama kelas);
  guru bisa **Reset** password kapan saja (sesi lama siswa langsung dihapus).
- Tombol **Aktif/Nonaktif** mengubah `is_active`; akun nonaktif ditolak saat login dan
  sesinya dihapus. **Hapus** menghapus akun permanen (sesi ikut terhapus via cascade).
- Import massal mendukung **Excel `.xlsx`** dan tetap kompatibel dengan CSV lama
  (`nama,email`). Kolom yang dikenali: `nomor` (diabaikan), `nama` (wajib), `kelas`,
  `tahun_ajaran`, `email`. Maks 200 baris / 2 MB.
- Resolusi kelas saat import: tanpa kelas → `null`; ada `tahun_ajaran` → harus cocok
  persis nama + tahun; tanpa tahun dan nama kelas unik → dipakai otomatis; nama kelas
  ganda antar tahun ajaran atau kelas tak dikenal → baris ditolak dengan alasan.
- Template `.xlsx` diunduh dari `GET /guru/siswa/template` (dibangkitkan `exceljs`):
  sheet **Data Siswa** (header + dropdown kelas), **Contoh** (tidak ikut diimport), dan
  **Daftar Kelas** (nama kelas + tahun ajaran tersedia).
- Hasil import: tabel + unduhan CSV kredensial kini menyertakan kolom `kelas`; baris
  gagal ditampilkan dengan nomor baris asli file (termasuk nomor baris Excel).
- **Pratinjau sebelum simpan**: setelah file dipilih, guru menekan **Periksa File** dan
  melihat tabel hasil pembacaan — nomor baris, nama, kelas yang berhasil dicocokkan,
  tahun ajaran, email, rencana username, serta status **Siap**/**Gagal** beserta
  alasannya. Belum ada akun yang dibuat sampai tombol **Import N Akun** ditekan. Setelah
  itu file divalidasi ulang di server (hasil pratinjau di client tidak dipercaya), jadi
  yang tersimpan selalu sama dengan yang tampil. Aksi: `previewImportSiswa` (baca saja,
  tanpa tulis DB) dan `importSiswa`; keduanya memakai `prepareImport` yang sama.
- Tombol **Ganti file** membatalkan pratinjau dan mengosongkan pilihan file.
- Server Actions: `src/lib/guru/siswa-actions.ts`; query: `siswa-queries.ts`;
  utilitas username/CSV: `siswa-utils.ts`; pembaca & pembangun Excel: `siswa-excel.ts`;
  komponen: `siswa-manager.tsx`, `siswa-row.tsx`, `siswa-import.tsx`,
  `credential-panel.tsx`.
- Semua aksi dibatasi `requireUser("guru")` dan hanya menyentuh `role = 'siswa'`.
- Status: create (dengan kelas), import `.xlsx` (valid, kelas ambigu, kelas tak dikenal,
  tahun salah, email invalid, nama kosong), backward-compat CSV, edit kelas, filter
  kelas, hapus kelas → siswa jadi "tanpa kelas", dan unduh template sudah diuji lewat
  browser; `tsc --noEmit`, `npm run lint`, dan `npm run build` bersih. Data uji dihapus.
- Diuji ulang pada **build production standalone** (`.next/standalone`, port 3002):
  tambah/edit/hapus/aktif-nonaktif siswa, reset password, import `.xlsx` (valid, kelas
  ambigu, kelas tak dikenal, duplikat nama → `nama2`), CSV lama, penolakan `.xls`,
  unduh template, serta CRUD kelas dan materi — semua lolos 20/20 percobaan beruntun.
- Zip deploy dibuat: `standalone-2026-11-18.zip` (18,8 MB, 2.990 file) dari
  `.next/standalone`; diuji dengan **mengekstrak zip ke folder kosong** lalu
  menjalankan `node server.js` (port 3003) — health `{"status":"ok","db":true}`,
  template `.xlsx` 11.570 byte (`PK`), dan import 1 baris lewat pratinjau berhasil.
  Catatan: `NODE_ENV=development` **jangan** dipakai saat build — prerender
  `/login/siswa` gagal (`Cannot read properties of null (reading 'useContext')`).
  Biarkan `NODE_ENV` kosong saat `npm run build`.
- Pratinjau import diuji di dev (port 3001) **dan** build standalone (port 3002):
  file uji 7 baris menampilkan 3 *Siap* + 4 *Gagal* dengan alasan tepat (kelas `9Z` tak
  terdaftar, kelas `9A` tidak ada di 2020/2021, nama kosong, email ganda di dalam file),
  jumlah siswa tetap 1 sebelum **Import**; setelah **Import 3 Akun** akun dibuat dengan
  kelas benar, daftar langsung berubah 1 → 4, dan CSV pratinjau kembali bersih setelah
  **Ganti file** / pilih file baru. Data uji dihapus lagi.

### Status loading saat berpindah halaman

- `NavigationProgress` (`src/components/navigation-progress.tsx`) — bar tipis di atas layar
  yang muncul seketika saat link internal diklik, lalu berhenti saat halaman selesai.
- `CenterLoading` (`src/components/center-loading.tsx`) — indikator terpusat berupa spinner +
  teks "Memuat…" di tengah layar. Muncul setelah 200 ms supaya navigasi cepat tidak berkedip.
- `useNavigationPending` (`src/lib/hooks/use-navigation-pending.ts`) — logika deteksi klik
  link internal yang dipakai bersama oleh progress bar dan indikator tengah. Juga mendengar
  event `kelasbit:busy` dari `emitBusy()`.
- Submit form login: tombol berubah jadi spinner + "Memproses…" (disabled), dan
  `emitBusy(true/false)` mengaktifkan indikator tengah sampai Server Action selesai.
- `loading.tsx` per rute (`/`, `/login`, `/login/siswa`, `/login/guru`, `/siswa`,
  `/guru`, `/guru/kelas`, `/guru/siswa`) — skeleton dengan shimmer yang meniru bentuk
  layout aslinya.
- `LinkPendingIndicator` — spinner kecil menggantikan ikon panah/tombol saat navigasi
  berlangsung, memakai `useLinkStatus()` dari Next.
- Semua animasi punya fallback `prefers-reduced-motion`.

Sudah diverifikasi (dev **dan** production build): 17 skenario lolos — login benar/salah,
redirect antar role, proteksi halaman, pesan error, dan `/dashboard` → 404.
Loading state juga diverifikasi lewat CDP: skeleton ter-render (9 elemen) saat navigasi
tertunda, progress bar `data-active="true"` selama menunggu, dan spinner link aktif.
`tsc --noEmit` bersih, `npm run lint` bersih, `npm run build` sukses.

## Yang belum dikerjakan

1. **Data dashboard siswa masih kosong** — shell dan kartu `/siswa` sudah ada, tetapi materi,
   tugas, jadwal, progress, dan pengumuman belum diisi (masih empty state). Dashboard guru
   sudah punya CRUD materi dan manajemen kelas; pengelolaan tugas dan nilai belum dibuat.
   Anggota siswa per kelas serta relasi materi → kelas juga belum ada.
2. **Belum ada registrasi mandiri** — akun siswa dibuat guru lewat `/guru/siswa`
   (satu per satu atau import CSV), akun guru masih lewat `npm run db:seed`.
3. **Belum ada rate limiting pada login.**
4. **Belum ada fitur lupa password.**
5. **Sesi lama belum dibersihkan otomatis** — baris kedaluwarsa baru dihapus saat dipakai.

## Cara lanjut di sesi berikutnya

```bash
docker compose up -d     # nyalakan Postgres
npm run dev              # jalankan app
```

- App: http://localhost:3000
- Login: http://localhost:3000/login
- Health check: http://localhost:3000/api/health
- Cek DB: `docker exec -it kelasbit-db psql -U kelasbit -d kelasbit`

## Catatan penting

- **Jangan jalankan `npm run build` saat `npm run dev` masih hidup.** Keduanya memakai
  folder `.next`; build menimpa hasil dev dan dev server mulai balas 500
  (`Cannot find module './xxx.js'` / `required-server-files.json`). Solusi:
  hentikan dev, hapus `.next`, lalu `npm run dev` lagi.
- **Hati-hati `NODE_ENV=production` yang terbawa dari environment.** Jika `npm run dev`
  membalas 500 dengan `Module parse failed: Unexpected character '@'` pada `globals.css`,
  itu tanda `NODE_ENV` bukan `development`. Jalankan `set NODE_ENV=development` dulu
  (cmd) atau `$env:NODE_ENV="development"` (PowerShell).
- Port 3000 di laptop dipakai project Next.js lain ("Portal Pembelajaran"), jadi app ini
  bisa jalan di 3001. Cek output `npm run dev` untuk tahu port aktual.
- Data lokal tersimpan di volume Docker `kelasbit_v2_db-data`. Jangan jalankan
  `docker compose down -v` kecuali memang ingin mengosongkan database.
- `npm run db:seed` memakai `--env-file=.env` karena Node tidak membaca `.env` otomatis.
- `allowImportingTsExtensions` di `tsconfig.json` diaktifkan karena `scripts/seed.ts`
  dijalankan langsung oleh Node, yang mewajibkan ekstensi `.ts` pada import.
- `npm run deploy:prepare` menyalin `.next/static` (dan `public/` jika ada) ke
  `.next/standalone`, sekaligus menghapus file `.env*` dari bundle. Jangan upload `.env`;
  gunakan **Environment Variables** cPanel.
- `react`/`react-dom` dipin ke **19.2.9** agar selaras dengan React yang dikompilasi
  Next 15.5 (19.2.0-canary). Jangan naikkan ke 19.3.x tanpa menaikkan Next juga.
- **Server Action jangan memakai `revalidatePath`.** Di Next 15.5 respons action bisa
  menggantung sehingga form `useActionState` pending selamanya. Halaman sudah dinamis
  (cookie), jadi cukup `router.refresh()` dari client lewat
  `useRefreshOnSuccess`/`useScheduleRefresh` (`src/components/guru/use-refresh-on-success.ts`).

## Pelajaran teknis

- **Jangan pakai `login.bind(null, role)` untuk Server Action.** Versi itu membuat form
  menggantung tanpa henti (server 100% CPU, respons tidak pernah selesai) setiap kali
  login **gagal**. Solusinya: action tanpa `bind`, role dikirim lewat
  `<input type="hidden" name="role">` dan divalidasi di sisi server.
- Saat menguji Server Action lewat `fetch` (bukan browser), sertakan header `Origin`
  dan cookie dari halaman form. Tanpa `Origin`, Next menolak dengan
  "Missing `origin` header from a forwarded Server Actions request."
- **`loading.tsx` mengubah semua `redirect()` di Server Component menjadi 200 + meta
  refresh 1 detik**, karena shell di-stream lebih dulu. Kalau redirect harus instan,
  lakukan di middleware (307), bukan di page. Karena itu `/login*` dan proteksi role
  dipindah ke `src/middleware.ts`, dan `/sesi` dipakai untuk redirect per-role.
- Skeleton hanya muncul setelah respons mulai mengalir. Jika request ditahan total
  (mis. `Fetch.requestPaused` tanpa dilepas), Next belum merender `loading.tsx`.
- `event.defaultPrevented` tidak bisa dipakai untuk mendeteksi klik `Link` Next, karena
  Next menandai event lebih dulu. Progress bar akhirnya mendeteksi klik tanpa cek itu.
- **Bug React 19.2: transisi router kadang tidak pernah commit.** Setelah Server Action,
  `router.refresh()` bisa selesai 200 dengan payload benar tetapi DOM tidak berubah
  (React membuang "ping" saat fase render; https://github.com/react/react/issues/37830,
  diperbaiki di React 19.3). Karena Next 15.5 memakai React 19.2 yang dikompilasi sendiri,
  kita pakai dua lapis mitigasi: refresh ditunda ±120 ms setelah action selesai, lalu
  `RouterNudge` (`src/components/router-nudge.tsx`) memicu state update kecil ±700 ms
  kemudian untuk membangunkan lane yang macet. Tanpa ini kegagalan ±40-50%; dengan
  keduanya 20/20 percobaan berhasil.
- **Kredensial import sebaiknya langsung diunduh.** Password hanya dikembalikan sekali
  dari Server Action; panel/CSV tidak bisa ditampilkan ulang setelah halaman ditutup.
