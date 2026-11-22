# Status Pengerjaan

Terakhir diperbarui: 21 November 2026

## Yang sudah jadi

- Setup project: Next.js 15.5 (App Router) + Tailwind v4 + Drizzle ORM + `pg`
- Konfigurasi deploy cPanel (`output: "standalone"`, `serverExternalPackages: ["pg"]`, image unoptimized)
- Database lokal via Docker Compose (Postgres 17, container `kelasbit-db`)
- `src/lib/db/index.ts` — pool `pg` lazy + instance Drizzle
- `src/app/api/health/route.ts` — health check, terverifikasi `{"status":"ok","db":true}`
- Landing page: `src/app/page.tsx`, `src/components/site-header.tsx`, `site-footer.tsx`, `icons.tsx`, `globals.css`
- Ikon web (favicon + apple touch icon) dari `kelasbit-icon.png`:
  `src/app/icon.png` (256px) dan `src/app/apple-icon.png` (180px)
- Logo `kelasbit-icon.png` juga dipakai di header publik, kartu login siswa,
  login guru (normal & maintenance), dan halaman maintenance
  (komponen `src/components/kelasbit-logo.tsx`, aset
  `public/kelasbit-icon.png`)
- Tombol CTA hero landing page disederhanakan menjadi satu tombol **Login** ke `/login`
- Label "Jelajahi Pelajaran", judul "Apa yang akan kita pelajari?", dan dua kartu
  mata pelajaran dihapus dari landing page; menu "Mata Pelajaran" ikut dihapus
  karena section `#mata-pelajaran` sudah tidak ada
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
| `/login/siswa` | Form login siswa (username/password atau token kelas) |
| `/login/guru` | Form login guru |
| `/siswa` | Dashboard siswa (wajib login sebagai siswa) |
| `/siswa/lab` | Lab Coding Python (editor, console, stdin, riwayat) |
| `/siswa/tugas` | Daftar tugas/ulangan/remedial coding |
| `/siswa/tugas/<id>` | Kerjakan tugas coding + riwayat pengumpulan |
| `/guru/tugas` | Kelola tugas/ulangan/remedial coding |
| `/guru/tugas/<id>` | Detail tugas + pengumpulan + penilaian |
| `/guru` | Dashboard guru (wajib login sebagai guru) |
| `/guru/kelas` | Manajemen kelas + token login (wajib login sebagai guru) |
| `/guru/siswa` | Manajemen siswa + akun login (wajib login sebagai guru) |
| `/guru/pengaturan` | Pengaturan aplikasi (wajib login sebagai guru) |
| `/maintenance` | Halaman publik saat mode maintenance aktif |
| `/guru-masuk/<token>` | Login guru khusus saat maintenance (URL rahasia) |
| `/siswa-masuk/<token>` | Login siswa khusus saat maintenance (token kelas atau username/password) |
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
- Tombol **Keluar** tersedia di topbar mobile (ikon saja di layar sempit, ikon + teks
  mulai `sm`) pada shell siswa dan guru; tombol di sidebar tetap ada untuk desktop.

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
  Reset wajib dikonfirmasi lewat panel **“Ya, reset password” / “Batal”** yang menyebut
  nama siswa dan akibatnya; Server Action juga menolak request tanpa `confirm=yes`
  (mencegah klik tidak sengaja).
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

### Profil & keamanan akun

- Halaman **`/siswa/profil`** dan **`/guru/profil`** — ringkasan akun (nama, username/email,
  kelas untuk siswa, status, tanggal bergabung), form edit profil, dan form keamanan.
- Edit profil: nama wajib; email siswa opsional; email guru wajib dan **butuh konfirmasi
  password saat ini** karena dipakai untuk login. Username dan role tetap read-only.
- Ganti password: minimal 8 karakter, wajib cocok dengan konfirmasi, dan harus berbeda dari
  password lama. Setelah berhasil, **semua sesi lain dicabut**; sesi yang sedang dipakai
  tetap aktif.
- Tombol **Keluar dari semua perangkat** menghapus seluruh sesi user lalu redirect ke
  `/login`.
- **Rate limiting login** berbasis tabel `login_attempts` (migration
  `drizzle/0006_smiling_titania.sql`): maksimal 5 kegagalan per username/email dan 30
  kegagalan per IP dalam 15 menit. Identifier dan IP disimpan sebagai hash SHA-256.
  Login sukses membersihkan catatan akun tersebut; jika query rate limit error, login
  bersifat fail-open agar gangguan DB kecil tidak mengunci semua pengguna.
- **Pembersihan otomatis**: sesi kedaluwarsa dan catatan percobaan login lebih dari 24 jam
  dihapus saat login berhasil / password diganti. Tidak perlu cron.
- Navigasi: menu **Profil** di sidebar siswa dan guru sudah berfungsi; avatar/nama di
  topbar dan sidebar menuju halaman profil. Nav siswa dipindah ke
  `src/components/dashboard/siswa-nav.tsx` supaya status aktif akurat.
- File utama: `src/lib/auth/rate-limit.ts`, `src/lib/akun/actions.ts`, `queries.ts`,
  `src/components/akun/*`, `src/app/(dashboard)/siswa/profil/*`,
  `src/app/(guru)/guru/profil/*`.
- Status: diuji manual lewat browser — edit nama & email guru (password salah ditolak,
  password benar diterima), email duplikat ditolak, profil siswa tampil, password lama
  gagal setelah ganti password dan password baru berhasil, validasi password lama salah,
  tombol keluar dari semua perangkat menghapus seluruh sesi, rate limit memblokir pada
  percobaan ke-6, login sukses membersihkan catatan gagal, dan cleanup menghapus sesi
  kedaluwarsa + catatan percobaan >24 jam. `tsc --noEmit`, `npm run lint`, dan
  `npm run build` bersih. Build standalone diuji di port 3002: `/api/health` →
  `{"status":"ok","db":true}`, login guru & siswa, `/guru/profil`, `/siswa/profil`,
  serta proteksi role (guru membuka `/siswa/profil` dialihkan ke `/guru`) lolos.

### Log login siswa

- Tabel `login_logs` lewat migration `drizzle/0007_absurd_baron_zemo.sql` (additive,
  3 index + FK `users.id` `ON DELETE SET NULL`).
- Mencatat percobaan login di halaman **Login Siswa**:
  - `berhasil` — login sukses.
  - `gagal` — password salah, akun tidak ditemukan, bukan akun siswa, atau akun nonaktif.
  - `diblokir` — melewati rate limit.
- Nama siswa dan kelas disimpan sebagai **snapshot** saat login, jadi riwayat tetap terbaca
  walau nama berubah, kelas dihapus, atau akun siswa dihapus. Identifier asli juga
  disimpan (username/teks yang diketik).
- Detail yang dicatat: IP (varchar 45, mendukung IPv6) dan User-Agent (dipotong 512
  karakter). Login guru **tidak** masuk log siswa.
- Log mulai berlaku setelah fitur dipasang; tidak ada backfill riwayat login lama.
- Pencatatan log dibungkus `try/catch`: kalau insert gagal (mis. migration belum jalan),
  login tetap berjalan.
- Halaman **`/guru/log-login`**:
  - statistik hari ini (berhasil, gagal, diblokir) + siswa unik berhasil login 7 hari;
  - filter status, kelas (snapshot), periode 7/30/90 hari/semua, dan pencarian
    nama/username;
  - pagination server-side 25 baris, filter disimpan di URL;
  - waktu ditampilkan dalam zona **Asia/Jakarta (WIB)**;
  - User-Agent diringkas menjadi label seperti “Chrome · Windows”.
- Retensi **90 hari**: log lama dihapus otomatis lewat `cleanupAuthData()` saat login
  berhasil / password diganti.
- File utama: `src/lib/auth/login-log.ts`, `src/lib/auth/request-info.ts`,
  `src/lib/guru/login-log-queries.ts`, `login-log-utils.ts`,
  `src/components/guru/login-log-table.tsx`,
  `src/app/(guru)/guru/log-login/*`.
- Status: diuji manual — log berhasil (termasuk snapshot kelas 9A), password salah,
  akun tidak ditemukan, kredensial guru di halaman siswa, akun nonaktif, dan blokir rate
  limit tercatat dengan status/reason tepat; login guru tidak tercatat; filter status,
  pencarian, filter kelas, periode, pagination, dan empty state bekerja; log lama >90 hari
  terhapus saat login; akun siswa yang dihapus menyisakan log dengan snapshot nama/kelas.
  Data uji sudah dihapus dari DB lokal. `tsc --noEmit`, `npm run lint`, dan
  `npm run build` bersih. Build standalone diuji di port 3002: `/api/health` →
  `{"status":"ok","db":true}`, halaman `/guru/log-login` tampil (empty state), dan login
  siswa lewat build standalone tercatat di `login_logs`.

### Login token kelas (siswa)

- Migration `drizzle/0009_loud_mongu.sql` (additive, tanpa `DROP`):
  - `kelas.login_token` (unik, nullable), `kelas.token_login_enabled` (default `false`),
    `kelas.token_updated_at`;
  - `login_logs.method` (default `'password'`) untuk membedakan metode login.
- Token: 6 karakter uppercase dari alphabet tanpa huruf/angka ambigu (`I/O/0/1`).
  Input siswa tidak peka huruf besar/kecil, spasi, atau tanda hubung (`FJA-6NE`).
  Disimpan plaintext karena guru perlu menampilkannya kembali.
- Pengelolaan di `/guru/kelas` (per kelas):
  - switch **Login token aktif/nonaktif** langsung di baris kelas
    (menyalakan tanpa token akan membuat token otomatis);
  - tombol **Token** membuka panel: tampilkan + **Salin** token;
  - **Token manual**: guru bisa mengetik sendiri 6 karakter (huruf/angka tanpa
    `I/O/0/1`); server menormalkan input dan menolak token yang sudah dipakai
    kelas lain (unique index) dengan pesan yang jelas;
  - **Buat/Ganti token** otomatis (token lama langsung mati) dan **Hapus token**
    (sekaligus menonaktifkan login token).
- **Saklar global** `token_login_enabled` di `/guru/pengaturan` (kartu
  **Login Token Kelas**):
  - default **aktif** kalau baris `app_settings` belum ada;
  - saat nonaktif, tab **Token Kelas** disembunyikan di `/login/siswa` dan
    `/siswa-masuk/<token>`, dan Server Action token menolak semua percobaan
    (reason log `token_global_off`) — berlaku untuk semua kelas;
  - token & switch per kelas tidak dihapus, hanya tidak bisa dipakai;
  - login username/password tetap berjalan; `/guru/kelas` menampilkan banner
    peringatan saat global nonaktif.
- Login siswa (`/login/siswa`):
  - tab **Username** (login lama, tetap ada) dan **Token Kelas**;
  - langkah 1: masukkan token → server memvalidasi (rate limit per IP) dan
    mengembalikan nama kelas + daftar **siswa aktif** saja;
  - langkah 2: pilih nama → server memvalidasi ulang token + siswa (kelas sama,
    role siswa, aktif), lalu membuat sesi;
  - alur lacak lokasi dan redirect memakai hook `useLoginFinish` yang sama dengan
    login password.
- Keamanan & edge case:
  - token nonaktif, token salah, kelas tanpa siswa aktif, siswa nonaktif, dan
    maintenance ditolak dengan pesan masing-masing;
  - token tidak ditulis mentah di log: identifier `token kelas (<nama kelas>)`;
  - karena token dipakai bersama, siswa yang tahu token bisa memilih nama teman
    (impersonasi). Guru bisa mengganti/menghapus token kapan saja.
- Log login menampilkan badge metode **Password** / **Token kelas**, dengan alasan
  baru: `token_salah`, `token_nonaktif`, `kelas_tanpa_siswa`, `siswa_tidak_ada`.
- File utama: `src/lib/auth/kelas-token.ts`, `kelas-token-format.ts`,
  `token-actions.ts`, `use-login-finish.ts`,
  `src/components/login-token-form.tsx`, `siswa-login-tabs.tsx`,
  `src/components/guru/kelas-token-panel.tsx`, `kelas-row.tsx`,
  `src/lib/guru/kelas-actions.ts`, `kelas-queries.ts`.
- Status: diuji lewat browser — token dibuat/diaktifkan, login dengan token
  (input lowercase + tanda hubung) menampilkan roster 3 siswa, pilih nama →
  dashboard siswa, log `berhasil` dengan metode token kelas; token salah ditolak;
  token dinonaktifkan ditolak; token lama setelah **Ganti token** ditolak dan token
  baru berhasil; siswa nonaktif hilang dari roster; **Hapus token** mengosongkan
  token; login username/password tetap berjalan. Data uji (token, sesi, log token)
  sudah dihapus. `tsc --noEmit`, `npm run lint`, dan `npm run build` bersih.

### Lacak lokasi login siswa

- Migration `drizzle/0008_clear_marvel_zombies.sql` (additive, tanpa `DROP`) menambah
  kolom `latitude`, `longitude`, `accuracy`, `location_status` di `login_logs` dan
  membuat tabel `app_settings` (key-value).
- **Toggle global** di `/guru/pengaturan`:
  - hanya guru yang bisa mengubah;
  - default **nonaktif** (tidak ada baris = nonaktif);
  - key `login_location_enabled` di `app_settings`;
  - berlaku untuk semua siswa.
- Alur saat aktif: kredensial **divalidasi dulu** (tombol “Memproses…”). Jika user tidak
  valid, tidak ada permintaan lokasi sama sekali. Jika login **berhasil**, sesi dibuat,
  baru browser diminta izin lokasi (`geolocation`, high accuracy), lalu lokasi disimpan
  ke baris log lewat route `POST /api/login-location` dan user diarahkan ke dashboard.
- Waktu tunggu lokasi **30 detik** saat dialog izin masih terbuka, dan **15 detik** jika
  izin sudah pernah diberikan. Selama menunggu, hanya tombol login yang berubah menjadi
  **“Menunggu izin lokasi…”** tanpa kotak informasi tambahan; overlay “Memuat…” juga tidak
  dipakai.
- Jika siswa menolak, timeout, atau perangkat tidak mendukung, login tetap berjalan.
  Login gagal/diblokir tetap `tidak_dicatat`.
- Server memvalidasi koordinat dan tetap membaca setting saat login berhasil. Jika toggle
  nonaktif, koordinat dari client diabaikan dan status menjadi `dimatikan`.
- Halaman `/guru/log-login` menampilkan link **Lihat peta (akurasi)** ke Google Maps serta
  status `ditolak`, `timeout`, `tidak_didukung`, `error`, `dimatikan`, atau
  `tidak_dicatat`. Badge **Lacak lokasi: Aktif/Nonaktif** tersedia di header log dengan
  link ke `/guru/pengaturan`.
- Retensi lokasi mengikuti log: **90 hari**.
- Privasi: browser selalu meminta izin, hanya guru yang melihat, dan fitur butuh **HTTPS**.
  Koordinat berasal dari browser sehingga bisa dimanipulasi.
- File utama: `src/lib/auth/geolocation.ts`, `geolocation-client.ts`,
  `login-location.ts`, `src/app/api/login-location/route.ts`,
  `src/lib/settings/queries.ts`, `actions.ts`,
  `src/components/guru/login-location-setting.tsx`,
  `src/app/(guru)/guru/pengaturan/*`.
- Status: diuji manual — user tidak terdaftar menampilkan error **tanpa memanggil
  geolocation** (0 panggilan); user valid menampilkan **“Memproses…”** dulu, lalu
  **“Menunggu izin lokasi…”** setelah login berhasil; lokasi tersimpan lewat
  `POST /api/login-location`; izin ditolak, timeout, dan koordinat tidak valid tetap
  membuat login berhasil dengan status yang tepat; login gagal tidak menyimpan lokasi;
  saat toggle nonaktif, tidak ada panggilan geolocation dan status `dimatikan`; toggle
  aktif/nonaktif tersimpan di `app_settings`; badge status di halaman log akurat. Data
  uji sudah dihapus dari DB lokal. `tsc --noEmit`, `npm run lint`, dan `npm run build`
  bersih. Build standalone diuji di port 3002: `/api/health` OK, `/guru/pengaturan`
  tampil default nonaktif, dan halaman `/guru/log-login` menampilkan badge nonaktif.

### Mode maintenance

- Pengaturan disimpan di `app_settings` (`maintenance_mode`, `maintenance_start`,
  `maintenance_title`, `maintenance_message`, `maintenance_until`,
  `maintenance_override_value`, `maintenance_override_start`,
  `maintenance_guru_token`, `maintenance_siswa_token`).
  Migration `0010_lovely_tarot.sql` menambah `sessions.maintenance_access`
  (additive). Fitur jadwal otomatis **tidak butuh migration** (key-value).
- Kartu **Mode Maintenance** di `/guru/pengaturan`:
  - switch manual, judul halaman, pesan;
  - **jadwal sekali jalan**: input **mulai otomatis** dan **selesai otomatis (WIB)**;
    waktu selesai **opsional** (kosong = maintenance berjalan sampai dimatikan
    manual), plus tombol **Kosongkan jadwal**;
  - ringkasan jadwal + badge status **Terjadwal / Aktif (jadwal) /
    Nonaktif — jadwal selesai**;
  - data lama yang hanya punya jam buka otomatis tetap didukung;
  - URL login **guru** dan URL login **siswa** + tombol salin dan **Ganti URL**.
- Penjadwalan otomatis (tanpa cron — dihitung saat request; input WIB disimpan
  ISO UTC):
  - sebelum `maintenance_start` → status mengikuti switch manual (biasanya normal);
  - di dalam `[start, until)` → maintenance **aktif otomatis**;
  - `until` kosong → maintenance **aktif sejak `start` dan tetap aktif** sampai
    dimatikan manual (open-ended);
  - setelah `until` → normal otomatis;
  - switch manual saat jendela aktif berfungsi sebagai **override sementara**
    (`maintenance_override_value` + `maintenance_override_start`, terikat ke
    jam mulai jadwal) dan tidak membatalkan jadwal, baik jadwal dengan akhir
    maupun open-ended;
  - setelah jadwal selesai, switch manual bisa dipakai lagi seperti biasa
    (perubahan manual dihitung jika terjadi setelah `until`).
- Banner informasi jadwal (`src/components/maintenance-schedule-notice.tsx`):
  - muncul saat jadwal **pending** di beranda, login siswa, dan dashboard guru;
  - di dashboard guru juga muncul saat jadwal **active** (maintenance otomatis
    sedang berjalan), di samping banner amber URL login guru yang sudah ada;
  - muncul saat **pending/active** di seluruh area dashboard siswa;
  - teks: "Maintenance terjadwal — Mulai … WIB" (dengan/tanpa waktu selesai)
    atau "Maintenance sedang berlangsung — Perkiraan selesai … WIB";
  - sengaja **tidak** memakai frasa "sampai dimatikan manual";
  - otomatis tersembunyi saat tidak ada jadwal, jadwal selesai, atau mode
    dikontrol Environment Variables.
- Saat aktif:
  - `(public)` layout → `/maintenance` (landing, `/login`, `/login/siswa`);
  - `/login/guru` biasa ditutup → `/maintenance`;
  - area `/guru/*` tetap terbuka untuk guru;
  - area siswa hanya terbuka untuk sesi yang login lewat `/siswa-masuk/<token>`
    (`sessions.maintenance_access = true`); sesi siswa lama tetap → `/maintenance`;
  - `/api/health` tetap bisa diakses.
- Login guru saat maintenance hanya lewat `/guru-masuk/<token>` (24 byte acak,
  base64url). Token salah → 404, halaman `noindex`, dan redirect ke `/login/guru`
  bila maintenance sudah nonaktif. Guru yang sudah punya sesi langsung ke `/guru`.
- Login siswa saat maintenance lewat `/siswa-masuk/<token-maintenance-siswa>`:
  - tersedia dua metode: **Token Kelas** (token kelas → pilih nama) dan
    **Username & Password**;
  - sesi yang dibuat diberi `maintenance_access = true` sehingga bisa membuka
    `/siswa` dan `/siswa/profil`;
  - halaman biasa `/login/siswa` tetap tertutup;
  - token salah → 404, `noindex`, maintenance nonaktif → redirect `/login/siswa`.
- Saat status maintenance berubah (nyala/mati) atau jadwal disimpan, flag
  `maintenance_access` semua sesi di-reset. Untuk maintenance terjadwal, area siswa
  juga menolak sesi dengan `maintenanceAccess` yang dibuat sebelum jam mulai jadwal
  (dibandingkan lewat `sessions.created_at`), sehingga sesi dari jendela maintenance
  sebelumnya tidak bisa dipakai untuk lolos otomatis.
- **Logout otomatis siswa saat maintenance** (berlaku manual & terjadwal):
  - `getCurrentUser()` menghapus sesi siswa login biasa dan mengembalikan `null`;
  - saat maintenance dinyalakan manual, semua sesi siswa langsung dihapus dari DB;
  - sesi yang dibuat lewat `/siswa-masuk/<token>` **setelah** jadwal mulai tetap
    diizinkan (tidak ikut di-logout);
  - `/sesi` membersihkan cookie sesi lalu redirect ke
    `/maintenance?sesi=berakhir`; halaman maintenance menampilkan catatan
    "Sesi Anda berakhir karena maintenance";
  - logout terasa pada request/refresh berikutnya (tanpa polling), dan sesi guru
    tidak terpengaruh.
- Halaman `/maintenance` di luar route group (tanpa header/footer situs), judul +
  pesan kustom, perkiraan selesai + hitung mundur bila dijadwalkan, dan **tanpa
  tautan login apa pun**. Balasan HTTP 200 dengan `noindex` (App Router tidak bisa
  mengeset 503 dari layout).
- Buka/tutup otomatis dicek saat request — tanpa cron: `maintenance_start` dan
  `maintenance_until` menentukan jendela, dan kartu pengaturan menandai status jadwal.
- Override cPanel: `MAINTENANCE_MODE`, `MAINTENANCE_GURU_TOKEN`,
  `MAINTENANCE_TITLE`, `MAINTENANCE_MESSAGE` (env mengalahkan DB; perlu Restart).
  Token env < 16 karakter diabaikan. Prosedur pemulihan ada di `DEPLOY.md`.
- Fail-open: kalau `app_settings` gagal dibaca dan env tidak memaksa, maintenance
  dianggap nonaktif supaya situs tidak salah terkunci.
- File utama: `src/lib/settings/maintenance.ts`,
  `maintenance-constants.ts`, `actions.ts`, `src/lib/auth/session.ts`,
  `src/components/guru/maintenance-setting.tsx`,
  `maintenance-banner.tsx`, `src/components/maintenance-countdown.tsx`,
  `src/app/maintenance/page.tsx`, `src/app/siswa-masuk/*`,
  `src/app/(guru-login)/*`.
- Status: diuji — `/login/siswa` tertutup saat maintenance; `/siswa-masuk/<token>`
  menampilkan dua tab; login password dari halaman itu berhasil dan membuka
  dashboard; login token kelas juga berhasil; sesi siswa lama (flag `false`) tetap
  dialihkan ke `/maintenance`; URL siswa salah → 404; **Ganti URL** membuat URL lama
  404 dan URL baru bekerja; saat maintenance dimatikan, flag semua sesi ter-reset dan
  `/siswa-masuk/<token>` redirect ke `/login/siswa`. `tsc --noEmit`, `npm run lint`,
  dan `npm run build` bersih; build standalone diuji (`/siswa-masuk/<token>` 200,
  token salah 404, `/login/siswa` 307 ke `/maintenance`). Data uji sudah dihapus.
- Status jadwal otomatis (20 November 2026): diuji di lokal — jadwal mulai di masa
  depan tampil **Terjadwal** dan situs normal; setelah jam mulai lewat, `/` dan
  `/login/siswa` 307 ke `/maintenance`; override manual mati/nyala saat jendela
  berjalan bekerja (situs 200/307) tanpa mengubah mode dasar; setelah jam selesai,
  situs otomatis 200 dan badge **jadwal selesai**; switch manual tetap bisa
  dinyalakan lagi setelah jadwal selesai; validasi form (hanya satu waktu,
  mulai ≥ selesai, selesai di masa lalu) menolak dengan pesan jelas; data lama
  `until`-only tetap menyimpan dan auto-open. **Jadwal open-ended** (hanya
  `start`, tanpa `until`) juga diuji: status Terjadwal → aktif otomatis →
  situs 307; override manual saat jadwal berjalan membuka situs (200) lalu
  menutupnya lagi (307); validasi menolak `until` saja untuk jadwal baru dengan
  pesan "Isi waktu mulai, atau kosongkan kedua waktu."
- Status banner informasi (20 November 2026): diuji — banner **kuning** tampil di
  `/`, `/login/siswa`, dashboard siswa, dan dashboard guru saat jadwal pending
  (dengan maupun tanpa waktu selesai); teks tanpa "dimatikan manual"; banner
  **hijau** tampil di dashboard siswa dan **dashboard guru** saat jadwal aktif
  (login lewat halaman maintenance); banner hilang setelah jadwal dikosongkan.
  Data uji dihapus. `tsc --noEmit` dan ESLint bersih.

- Status logout otomatis (20 November 2026): diuji di lokal — sesi siswa reguler
  dihapus saat maintenance manual dinyalakan (sesi guru tetap); request berikutnya
  diarahkan ke `/login/siswa` → `/sesi` → `/maintenance?sesi=berakhir` dengan cookie
  dibersihkan; sesi `/siswa-masuk/<token>` (maintenance access) tetap bisa membuka
  dashboard (200); sesi maintenance kedaluwarsa dari jendela sebelumnya ikut dihapus;
  catatan "Sesi Anda berakhir karena maintenance" tampil. Data uji dihapus.
  `tsc --noEmit` dan ESLint bersih.

### Lab Coding Python (siswa)

- Route `/siswa/lab`; menu **Lab Coding** di sidebar/mobile sekarang aktif.
- Python berjalan di **Web Worker Pyodide 0.27.2** (`public/lab/pyodide-worker.js`,
  dimuat dari CDN jsDelivr). Kode siswa tidak pernah dikirim ke server.
- Editor **CodeMirror 6** (highlight Python, line numbers, bracket matching, tema
  gelap), console stdout/stderr, dan **input interaktif**:
  - saat kode memanggil `input()`, muncul **modal** berisi prompt program;
  - jawaban dikirim, lalu program dijalankan ulang dengan jawaban terkumpul
    sampai tidak ada `input()` lagi (probe + rerun di worker);
  - prompt dan jawaban **tidak ditulis ke console**; console hanya menampilkan
    output yang dicetak kode program;
  - output hanya diambil dari percobaan final; maksimal 50 input per run;
  - timer 5 detik dijeda selama modal terbuka; jawaban kosong diperbolehkan.
- **Run** (Ctrl/Cmd+Enter) dan **Stop**; timeout 5 detik → worker dihentikan,
  status `timeout`, Pyodide dimuat ulang otomatis.
- Setiap Run disimpan ke tabel **`lab_runs`** (migration `0011_easy_killer_shrike.sql`,
  additive):
  - kolom `user_id`, `code`, `stdin`, `stdout`, `stderr`, `status`
    (`success`/`error`/`timeout`/`stopped`), `duration_ms`, `created_at`;
  - maksimal **50 run per siswa** (run lama dipangkas);
  - output dibatasi 20 KB, kode 50 KB, stdin 10 KB di Server Action.
- Halaman menampilkan **20 riwayat terakhir**; klik riwayat memuat kode + output
  (jawaban input tersimpan di kolom `stdin` sebagai catatan); saat di-Run lagi,
  input **ditanyakan ulang dari awal**. Setiap item bisa dihapus dengan konfirmasi.
- Draft kode editor disimpan di `localStorage` agar tidak hilang saat refresh.
- File utama: `src/app/(dashboard)/siswa/lab/page.tsx`,
  `src/components/lab/*` (termasuk `input-prompt-dialog.tsx`),
  `src/lib/lab/actions.ts`, `src/lib/lab/queries.ts`,
  `public/lab/pyodide-worker.js`.
- Catatan operasional: load awal Pyodide ±6–10 MB (di-cache browser, butuh
  internet). Jika perlu mode offline, aset Pyodide bisa di-self-host di
  `public/pyodide/`.
- Status uji (20 November 2026): `print` + `input()` menampilkan modal prompt
  tanpa menuliskan prompt/jawaban ke console; dua input berurutan muncul
  bergantian; kode error menyimpan status `error` + traceback; infinite loop
  berhenti ±5 detik dan tersimpan `timeout`; Stop & Batal saat modal menyimpan
  `stopped`; riwayat menyimpan jawaban, dan re-run menanyakan input lagi;
  tampilan desktop & mobile dicek. Data uji dihapus. `tsc --noEmit` dan ESLint
  bersih.

### Tugas coding (tugas / ulangan / remedial)

- Menu **Tugas** aktif untuk guru & siswa:
  - guru: `/guru/tugas` (buat & daftar) dan `/guru/tugas/<id>` (pengumpulan + nilai);
  - siswa: `/siswa/tugas` (daftar) dan `/siswa/tugas/<id>` (kerjakan + riwayat).
- Migration `0012_workable_ser_duncan.sql` (additive):
  - `tugas`: judul, deskripsi, jenis (`tugas`/`ulangan`/`remedial`),
    `target_type`, `kelas_id`, `starter_code`, `expected_output`,
    `max_score`, `max_attempts`, `due_at`;
  - `tugas_submissions`: kode, stdin, stdout, stderr, status, attempt, skor,
    feedback, waktu kumpul/nilai; FK cascade ke tugas dan users.
- Migration `0013_smart_stark_industries.sql` (additive):
  - `tugas.target_type` (`semua`/`kelas`/`siswa`) + backfill data lama;
  - tabel `tugas_targets` untuk siswa tertentu (unik per tugas+user, cascade).
- Migration `0014_wealthy_cargill.sql` (additive):
  - `tugas`: `min_score` (KKM), `repeat_until_pass`, `structure_rules` (jsonb),
    `structure_weight`;
  - `tugas_submissions`: `metrics`, `checks`, `output_score`, `structure_score`,
    `passed`.
- Migration `0015_ambitious_sasquatch.sql` (additive): `tugas.solution_code`
  untuk **kunci jawaban** (hanya ditampilkan di akun guru).
- Target tugas (eksklusif):
  - **Semua kelas**, **satu kelas**, atau **beberapa siswa** (tanpa batas
    jumlah, bisa lintas kelas/siswa tanpa kelas);
  - tugas **target siswa** yang sudah dibuat bisa ditambah/dikurangi siswanya
    dari halaman detail guru: tombol **Tambah siswa** dan ikon hapus pada chip
    target; siswa yang sudah menjadi target tidak muncul lagi dan duplikat
    diabaikan di server;
  - menghapus target tidak menghapus submission, nilai, atau riwayat siswa;
  - query halaman siswa dan Server Action submit sama-sama memeriksa target;
  - guru dapat melihat daftar target siswa dan jumlahnya di halaman detail.
- **Pemeriksaan struktur otomatis** (AST di Web Worker, dievaluasi di server):
  - tepat N `input()`, minimal N `print()`, minimal N baris output;
  - variabel wajib + variabel nilai tetap/string, dengan nama **harus sama
    persis** (huruf besar/kecil);
  - **variabel dari `input()`**: harus di-assign dari `input()`/ekspresi yang
    mengandung `input()`;
  - variabel nilai tetap harus berupa string literal;
  - **variabel wajib dipakai di `print()`**: dihitung bertahap berdasarkan
    jumlah variabel yang dipakai (mis. 4/5 = 80%); rasio ini mengalikan nilai
    akhir dan tetap wajib 5/5 untuk lulus;
  - check **variabel input berasal dari `input()`** bersifat kritis: jika
    gagal, nilai output dianggap 0 (anti-hardcode);
  - larangan `for/while` dan `if/else` (termasuk ternary);
  - worker mengirim metrik, server menghitung checklist & skor.
- **Penilaian otomatis**:
  - output (default 60%) + struktur (default 40%), bobot struktur dapat diatur;
  - output **tidak lagi binary**: typo kecil mendapat nilai parsial berdasarkan
    kemiripan per baris (Levenshtein), maksimal 92% dari bobot output;
  - baris hilang/tambahan dan selisih jumlah baris mengurangi nilai;
  - output kosong/error/timeout dan kegagalan check kritis = 0;
  - status lulus membutuhkan nilai ≥ KKM **dan** semua struktur wajib lulus;
  - guru tetap bisa override nilai manual.
- **KKM & pengulangan**: `min_score` (mis. 75) dan `repeat_until_pass`:
  - nilai ≥ KKM dan struktur wajib lengkap = Lulus;
  - siswa masih boleh mengulang jika nilainya tinggi tetapi struktur wajib
    belum lengkap;
  - **jeda 5 menit** setelah percobaan ke-5, 10, 15, dst.; selama jeda Run dan
    Kumpulkan dikunci (editor tetap bisa dilihat);
  - deadline selalu didahulukan; jika lewat, submit ditolak;
  - siswa hanya melihat nilai total + status, tanpa checklist/koreksi; modal
    menampilkan pesan umum jika output kritis atau struktur wajib gagal.
- Detail guru menampilkan **jawaban siswa** (kode), input yang dipakai,
  output, error, checklist struktur, dan form nilai di dalam kartu pengumpulan
  yang dapat dibuka/tutup.
- Bagian **Pengumpulan Siswa** hanya menampilkan **attempt terakhir per siswa**
  (data attempt lama tetap disimpan untuk hitung percobaan/jeda).
- Kartu pengumpulan **tertutup default**: header berisi nama + ringkasan
  (percobaan, waktu, status, nilai, lulus). Klik header untuk membuka
  struktur, jawaban, output, diff, feedback, dan form nilai.
- Ringkasan **roster tugas** di detail guru:
  - jumlah siswa ditugaskan, lulus KKM, belum lulus, belum mengerjakan,
    dan akun nonaktif;
  - tabel siswa dengan pencarian + filter status;
  - status **Lulus / Belum lulus / Sudah mengerjakan / Belum mengerjakan**;
  - **pagination 15 siswa per halaman** (hanya muncul jika lebih dari 15);
    filter/pencarian otomatis kembali ke halaman 1;
  - tombol **Lihat jawaban** membuka **modal detail** siswa tanpa scroll/hash;
    modal berisi checklist struktur, kode, input, output, error, diff,
    feedback, dan form nilai. Bisa ditutup lewat tombol X, klik backdrop,
    atau Escape.
  - **perbandingan 2 siswa**: centang dua siswa di tabel (maksimal 2), lalu
    klik **Bandingkan jawaban**. Modal menampilkan dua kolom detail jawaban,
    ringkasan kode/output sama/berbeda, nilai, status, dan checklist struktur.
    Form nilai disembunyikan di mode perbandingan; gunakan modal detail
    tunggal untuk menilai.
  - **Reset pekerjaan siswa** dari modal detail: konfirmasi, lalu seluruh
    submission siswa pada tugas tersebut dihapus. Attempt, nilai, feedback,
    status lulus, riwayat, dan jeda percobaan ikut ter-reset; target tugas
    tidak dihapus. Hanya guru yang bisa melakukan reset.
  - **Kunci copy/paste** per tugas (migration additif
    `0016_yummy_shatterstar.sql`, default nonaktif):
    - checkbox saat membuat tugas + toggle **Aktif/Nonaktif** di detail tugas;
    - student editor memblokir copy, cut, paste, drag-drop, context menu, dan
      event `beforeinput` mobile (paste/drop/cut);
    - heuristik keyboard mobile: insert teks >2 karakter atau multiline tanpa
      keydown dalam 800 ms dianggap paste dan diblokir;
    - atribut autocomplete/autocorrect/spellcheck/Grammarly dimatikan;
    - badge dan peringatan tampil di editor;
    - input prompt `input()` tetap boleh paste karena bukan editor kode.
  - **Tutup tugas manual** (migration additif
    `0017_outgoing_christian_walker.sql`, default terbuka):
    - switch **Dibuka/Ditutup** di detail tugas guru;
    - kartu tugas tetap tampil di akun siswa dengan status **Ditutup**;
    - link/CTA siswa dinonaktifkan dan URL detail langsung menghasilkan 404;
    - Server Action submit menolak dengan pesan “Tugas sudah ditutup oleh
      guru”;
    - membuka kembali tidak menghapus submission, nilai, atau riwayat.
  - **GPS per tugas** (migration additif
    `0018_fantastic_pet_avengers.sql`, default nonaktif untuk tugas lama dan
    dicentang secara default pada form tugas baru):
    - switch **GPS wajib** di detail tugas guru;
    - siswa harus mengaktifkan GPS sebelum halaman tugas terbuka;
    - lokasi valid **1 jam**; gate muncul lagi jika sudah kedaluwarsa;
    - server menolak submit tanpa lokasi presisi dalam 1 jam;
    - setiap pencatatan masuk ke tabel `tugas_locations`;
    - ambil hingga **3 sampel** dan pakai akurasi terbaik;
    - tingkat akurasi: **Sangat presisi ≤50 m**, **Presisi 51–200 m**,
      **Cukup presisi 201–350 m**, **Kurang presisi 351–500 m**, dan
      **Di luar batas >500 m** (ditolak);
    - guru melihat lokasi terakhir di roster/modal tugas dan riwayat lengkap
      di halaman detail siswa `/guru/siswa/<id>`;
    - gate GPS responsif di HP, menampilkan status izin browser dan panduan
      reset izin per Chrome Android, Safari iPhone, Chrome/Edge, dan Firefox;
    - reset pekerjaan menghapus riwayat lokasi siswa untuk tugas tersebut.
  - **Kode pass GPS** (migration additif
    `0019_careless_silk_fever.sql`):
    - guru membuat kode per siswa + tugas dari modal detail siswa;
    - kode **8 karakter**, terikat ke siswa/tugas, dan bisa dipakai berulang;
    - kode tetap aktif sampai guru menekan **Nonaktifkan**;
    - siswa memasukkan kode di gate GPS untuk membuka tugas tanpa GPS presisi;
    - membuat kode baru otomatis menonaktifkan kode lama;
    - guru melihat status aktif/nonaktif, waktu pemakaian, dan status bypass;
    - reset pekerjaan menghapus kode pass siswa pada tugas tersebut.
- Panel **Perbedaan output** di detail guru membandingkan output siswa dengan
  target per baris:
  - menandai baris berbeda/hilang/tambahan;
  - menjelaskan kolom pertama yang berbeda (spasi, tab, karakter, karakter
    kurang/tambahan);
  - spasi divisualkan sebagai `·` dan tab sebagai `→`;
  - mencatat bahwa auto-grade mengabaikan spasi akhir baris.
- **Export Excel** progres tugas di detail guru:
  - tombol **Export Excel** → `/guru/tugas/<id>/export`;
  - khusus guru, 404 jika tugas tidak ada;
  - sheet `Progres Tugas` berisi ringkasan (jenis, target, KKM, deadline,
    jumlah ditugaskan/lulus/belum/belum mengerjakan/nonaktif) dan tabel semua
    siswa: Nama, Username, Kelas, Status, Percobaan, Nilai Terakhir,
    Nilai Terbaik, Lulus KKM, Terakhir Mengumpulkan, Akun;
  - header freeze + auto-filter, warna status, file `progres-tugas-<id>.xlsx`.
- **Preset lengkap** di form guru: *Bukti Peminjaman Alat Laboratorium* mengisi
  judul, soal, kode awal, expected output (judul rata tengah), **kunci jawaban**,
  target siswa, aturan struktur, bobot 40, KKM 75, dan ulangi sampai lulus.
- Detail tugas guru menampilkan **Kunci jawaban (kode)** dan output yang
  diharapkan; kunci tidak pernah dikirim ke halaman siswa.
- Halaman siswa menampilkan kartu **Ketentuan Tugas** yang mudah dibaca:
  chips **variabel yang harus dibuat**, variabel nilai tetap (string), aturan
  program, KKM, dan info jeda. Kartu ini hanya berisi ketentuan statis — tidak
  menampilkan hasil pemeriksaan/koreksi.
- Siswa juga melihat panel **Output yang diharapkan** (open by default) di
  samping console agar bisa membandingkan hasil Run dengan target soal. Panel
  bisa dilipat dan tetap tidak menampilkan checklist/koreksi otomatis.
- Setelah **Kumpulkan**, hasil tampil sebagai **modal di tengah layar**:
  status lulus/belum lulus, nilai total, KKM, dan info jeda. Modal punya tombol
  **Tutup**; halaman baru di-refresh setelah modal ditutup. Tidak ada koreksi
  struktur/output yang ditampilkan ke siswa.
- Guru membuat tugas dengan kode awal + **output yang diharapkan**:
  - auto-grade membandingkan stdout dengan expected output setelah normalisasi
    (CRLF, spasi akhir baris, trim);
  - expected output kosong = nilai manual;
  - guru dapat menimpa skor + memberi feedback dari halaman detail.
- Siswa mengerjakan di editor yang sama dengan Lab (Pyodide + input modal):
  - tombol **Kumpulkan** hanya aktif setelah Run terakhir berhasil dan kode
    tidak berubah;
  - batas waktu & jumlah percobaan dicek di client dan Server Action;
  - nilai otomatis langsung tampil (atau “menunggu penilaian”);
  - riwayat percobaan menampilkan kode, output, nilai, dan feedback.
- Catatan: **remedial saat ini berlaku per kelas** (belum per siswa); belum ada
  timer ulangan; output dieksekusi di browser sehingga guru tetap perlu meninjau
  kode untuk ulangan yang ketat.
- Status uji (21 November 2026): guru membuat tugas output `Halo, dunia!`; siswa
  menulis `print("Halo, dunia!")`, Run, Kumpulkan → auto-grade **100/100** dan
  submission tersimpan; guru mengubah nilai menjadi **90** + feedback dan
  tersimpan; daftar tugas, detail, riwayat, dan form penilaian tampil benar.
  Target diuji: tugas remedial untuk **Siswa Demo** hanya terlihat olehnya,
  tugas kelas **9A** hanya terlihat oleh siswa 9A, dan siswa di luar target
  mendapat halaman 404. Data uji dihapus. `tsc --noEmit`, ESLint, dan
  `npm run build` bersih.
- Status uji struktur/KKM (21 November 2026): preset mengisi form dengan benar;
  kode valid (3 input, 17 print, 5 variabel) mendapat **100** (output 60 +
  struktur 40, 7/7 aturan); kode `print("x")` mendapat **11** dan status
  **Belum lulus**; percobaan ke-5 memicu jeda **5 menit** (Run & Kumpulkan
  terkunci, countdown tampil), lalu aktif lagi setelah jeda lewat; deadline
  lewat menutup tugas meski masih ada jeda; guru melihat checklist dan status
  lulus. Data uji dihapus.
- Status uji roster (21 November 2026): task target 3 siswa; roster menghitung
  3 ditugaskan, 1 lulus KKM, 1 belum lulus, 1 belum mengerjakan; kartu
  pengumpulan hanya menampilkan attempt terakhir (attempt lama tidak muncul).
  Data uji dihapus.
- Status uji kartu tertutup (22 November 2026): kartu pengumpulan default
  tertutup; klik header membuka seluruh detail. Data uji dihapus.
- Status uji pagination + modal roster (22 November 2026): task dengan 24 siswa
  menampilkan **15 baris** di halaman 1 dan **9 baris** di halaman 2; filter
  kembali ke halaman 1. Klik **Lihat jawaban** membuka modal tanpa mengubah
  `scrollY`/hash; modal berisi detail jawaban, dapat ditutup lewat X, backdrop,
  atau Escape. Data uji 20 siswa + task uji dihapus.
- Status uji perbandingan 2 siswa (22 November 2026): centang dua siswa →
  tombol **Bandingkan jawaban** aktif; modal menampilkan dua kolom detail,
  ringkasan `Kode: berbeda`, `Output: sama`, `Nilai: 100 vs 80`, checklist,
  kode, dan output. Form nilai tidak ditampilkan di mode perbandingan; modal
  dapat ditutup dengan X/Escape dan tidak mengubah scroll. Diuji memakai data
  tugas yang sudah ada.
- Status uji reset pekerjaan siswa (22 November 2026): task + siswa uji dengan
  1 submission bernilai 100; tombol **Reset pekerjaan** di modal, konfirmasi,
  lalu submission dihapus. Roster berubah menjadi **0 percobaan / belum
  mengerjakan**, jumlah pengumpulan menjadi 0, target tugas tetap ada.
  Data uji dihapus.
- Status uji kunci copy/paste (22 November 2026): task uji dengan
  `block_copy_paste=true`; event `copy`, `cut`, `paste`, `drop`, `contextmenu`,
  dan `beforeinput insertFromPaste` semuanya `defaultPrevented` dan isi editor
  tidak berubah; mengetik manual tetap berjalan. Toggle guru mengubah nilai DB
  dan halaman siswa setelah refresh; saat nonaktif event copy kembali normal.
  Input prompt tidak terdampak. Data uji dihapus.
- Status uji heuristik paste mobile (22 November 2026):
  - `beforeinput insertText` teks panjang tanpa keydown diblokir dan isi
    editor tidak berubah;
  - insert satu karakter tetap diizinkan;
  - atribut autocomplete/autocorrect/spellcheck/Grammarly aktif;
  - data uji dihapus.
- Status uji tutup tugas manual (22 November 2026): switch guru
  `Dibuka → Ditutup` mengubah DB; kartu siswa tetap tampil dengan status
  **Ditutup** tanpa link/CTA aktif; URL detail langsung menghasilkan **404**;
  switch `Ditutup → Dibuka` mengembalikan link dan akses. Data uji dihapus.
- Status uji GPS tugas (22 November 2026): task `require_gps=true`; halaman
  siswa hanya menampilkan gate GPS tanpa editor. Izin ditolak tercatat dan
  editor tetap terkunci; lokasi emulasi berhasil disimpan, halaman tugas
  terbuka, roster guru menampilkan **Lihat peta**, dan halaman detail siswa
  menampilkan riwayat `tersedia` + `ditolak`. Switch GPS dimatikan → gate
  hilang; dinyalakan lagi dan lokasi dibuat >1 jam → gate muncul kembali.
  Data uji dan riwayat lokasi dihapus.
- Status uji akurasi + kode pass GPS (22 November 2026):
  - lokasi akurasi **550 m** disimpan tetapi gate tetap terkunci dan muncul
    pesan **di luar batas**;
  - lokasi akurasi **450 m** diterima sebagai **Kurang presisi** dan editor
    terbuka;
  - guru membuat kode 8 karakter dari tombol **Kode GPS** pada roster,
    termasuk untuk siswa yang belum punya submission;
  - siswa memasukkan kode → halaman tugas terbuka tanpa GPS;
  - guru menonaktifkan kode → reload siswa menampilkan gate lagi;
  - data uji, lokasi, dan kode pass dihapus.
- Status uji mobile GPS (22 November 2026): viewport **390 px** tanpa scroll
  horizontal; tombol GPS dan input kode full-width; status izin browser tampil;
  panel **“GPS tidak akurat atau ingin reset izin?”** berisi panduan Chrome
  Android, Safari iPhone, Chrome/Edge desktop, dan Firefox. Data uji dihapus.
- Status uji export Excel (22 November 2026): route guru menghasilkan
  `progres-tugas-<id>.xlsx` (200) dengan sheet `Progres Tugas`, ringkasan
  target/KKM, serta baris lulus, belum lulus, dan belum mengerjakan; tanpa
  login diarahkan ke halaman login dan ID tidak valid menghasilkan 404.
  Data uji dihapus.
- Status uji tambah target siswa (22 November 2026): task target 1 siswa,
  tombol **Tambah siswa** menampilkan picker berisi siswa aktif yang belum
  menjadi target; menyimpan 1 siswa menambah target menjadi 2 dan roster
  ikut berubah. Duplikat tidak dibuat ulang. Data uji dihapus.
- Status uji hapus target siswa (22 November 2026): task target 2 siswa;
  ikon hapus pada chip target + konfirmasi mengurangi target menjadi 1 dan
  roster ikut berubah; submission/nilai tidak dihapus. Data uji dihapus.
- Status uji variabel input (22 November 2026): AST mendeteksi `nama` dari
  `input()` dan penggunaannya di f-string/print. Kode
  `nama = input(); print("Halo, Dimas")` mendapat **35/100**, output **0**,
  status **tidak lulus**, dan check **wajib** gagal; kode
  `nama = input(); print(f"Halo, {nama}")` mendapat **100/100** dan lulus.
  Preset mengisi variabel input `nama, kelas, alat`; syarat yang sama juga
  tampil di halaman siswa. Data uji dihapus. `tsc` dan ESLint bersih.
- Status uji nilai parsial + struktur wajib (22 November 2026):
  - typo 1 huruf pada 1 baris → output **53/60**, struktur **40/40**, total
    **93/100**, status **lulus**;
  - nama variabel `Judul` padahal diminta `judul` → output **60/60** tetapi
    struktur **31/40**, total **91/100**, status **tidak lulus**;
  - kode memakai `input()` tetapi `print()` ditulis hardcode → output **0**,
    total **36/100**, status **tidak lulus**;
  - siswa tetap bisa mengulang setelah nilai tinggi tetapi struktur wajib
    gagal. Data uji dihapus.
- Status uji variabel nilai tetap + print koma (22 November 2026):
  - `print("Tanggal :", tanggal)` → **100/100**, lulus (pemisah koma
    didukung);
  - `tanggal` sudah dibuat tetapi `print("Tanggal : 28 November 2026")` →
    variabel dipakai **4/5**, nilai akhir **80/100**, status **tidak lulus**
    karena struktur wajib belum lengkap;
  - `print` dengan `file=sys.stderr` tidak dihitung sebagai pemakaian variabel;
  - preset diubah memakai pemisah koma, bukan f-string. Data uji dihapus.
- Status uji skor variabel bertahap (22 November 2026): task 5 variabel;
  kode dengan 4 variabel di print mendapat **80/100** (4/5), kode 5/5 mendapat
  **100/100** dan lulus. Detail check menampilkan jumlah dan nama variabel yang
  belum dipakai. Submission lama yang memakai hardcode tanggal diperbarui ke
  **80/100, tidak lulus**. Data uji dihapus.
- Status uji matriks penilaian (22 November 2026, harness `computeAutoGrade`
  dengan 5 variabel):
  - benar **100/lulus**; kurang `input()` **20**; nama variabel `Nama` **24**;
    variabel `tanggal` terlewat **72**; isi tahun salah **94/lulus**;
    spasi/garis `=`/`-` kurang **91/lulus**; typo karakter **94/lulus**;
    sintaks salah **0**; output kurang 1 baris **68**; output tambahan
    **86/lulus**; hardcode tanggal (4/5) **80/tidak lulus**; input bukan dari
    `input()` **35**; `for/if` terlarang **90/tidak lulus**; `print()` kurang
    **95/tidak lulus**; output kosong **30**.
  - Catatan: kegagalan struktur wajib non-variabel (print kurang, for/if)
    tetap menggagalkan status meskipun nilai totalnya masih tinggi.

### Deploy produksi (19 November 2026)

- Deploy ke cPanel **berhasil**; fitur profil, log login, dan lacak lokasi berjalan normal.
- Kondisi awal produksi: tabel `0000`–`0005` sudah ada, tetapi
  `drizzle.__drizzle_migrations` belum ada. Migration `0006`–`0008` dijalankan manual,
  lalu jurnal `0000`–`0008` disinkronkan.
- Panduan langkah deploy ada di `DEPLOY-CPANEL.md`.
- Koneksi DB di Terminal cPanel: upload `scripts/cpanel-db-env.sh`, lalu
  `source ~/cpanel-db-env.sh`. Password diminta setiap sesi dan tidak disimpan.
- Jurnal migrasi untuk deploy berikutnya dibuat dengan
  `npm run db:journal -- --out migrasi/journal-YYYY-MM-DD.sql`.
- Bundle yang dipakai: `standalone-2026-11-19.zip`; migrasi:
  `migrasi-2026-11-19.zip`.
- **Deploy kedua (malam 19 November 2026):** mode maintenance (URL login guru &
  siswa), login token kelas, login siswa saat maintenance, dan tombol keluar mobile.
  Dikonfirmasi user: aplikasi berjalan normal setelah deploy.
  - Migration additive `0009_loud_mongu.sql` + `0010_lovely_tarot.sql` diterapkan
    manual setelah backup `backup-2026-11-19-pre-v2.dump`; jurnal Drizzle
    disinkronkan setelahnya.
  - Bundle: `standalone-2026-11-19-v2.zip`; migrasi: `migrasi-2026-11-19-v2.zip`.
  - Rollback disimpan: `~/apps/kelasbit-old`, `~/backup-2026-11-19-pre-v2.dump`,
    dan build lama `standalone-2026-11-19.zip`.
  - Catatan terminal: `~/cpanel-db-env.sh` harus di-upload lebih dulu. Kalau belum
    ada, set manual `PGUSER=ktimmgvh_kelasbit PGDATABASE=ktimmgvh_kelasbit`
    (password = password user PostgreSQL, bukan login cPanel).

## Yang belum dikerjakan

1. **Data dashboard siswa masih kosong** — shell dan kartu `/siswa` sudah ada, tetapi
   materi, jadwal, progress, dan pengumuman belum diisi (masih empty state). Menu
   **Tugas** sudah berisi tugas coding (dengan target kelas/siswa), tetapi belum ada
   rekap **Nilai** per siswa/kelas atau timer ulangan. Anggota siswa per kelas
   serta relasi materi → kelas juga belum ada.
2. **Belum ada registrasi mandiri** — akun siswa dibuat guru lewat `/guru/siswa`
   (satu per satu atau import CSV). Sesuai keputusan pemilik, hanya ada **satu akun guru**
   yang dibuat lewat `npm run db:seed`; belum ada UI untuk menambah akun guru lain.
3. **Belum ada fitur lupa password** — karena belum ada pengiriman email/SMTP; reset
   password guru saat ini hanya lewat database/seed.

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
- **Rate limit login sengaja fail-open.** Kalau query `login_attempts` gagal (mis. migrasi
  belum jalan), login tetap diproses dan error dicatat di log. Jangan ubah menjadi
  fail-closed tanpa memastikan tabel selalu ada.
- **Email guru = identitas login.** Perubahan email guru wajib konfirmasi password saat ini.
  Setelah ganti password, sesi lain dicabut tetapi sesi aktif dipertahankan lewat
  `getSessionId()`.
- **Log login menyimpan IP dan User-Agent mentah** di `login_logs` dan hanya ditampilkan
  di area guru. Retensinya 90 hari. Kalau kebijakan privasi sekolah berubah, hash atau
  samarkan IP sebelum ditampilkan.
- **Halaman `/guru/log-login` membutuhkan migration `0007`.** Login tetap berjalan tanpa
  tabel itu (fail-open), tetapi halaman log akan error sampai migration diterapkan.
- **Lacak lokasi butuh HTTPS dan izin browser.** Koordinat berasal dari client dan bisa
  dimanipulasi; jangan jadikan satu-satunya bukti. Default toggle **nonaktif** dan
  disimpan di `app_settings`; setting dibaca saat login berhasil. Lokasi hanya disimpan
  pada login berhasil.
- **Token kelas bersifat bersama.** Siapa pun yang tahu token bisa memilih nama siswa lain
  di kelas yang sama, sehingga log dan lokasi bisa tercatat atas nama orang lain. Ganti
  atau hapus token bila bocor. Token disimpan plaintext di `kelas.login_token` karena guru
  perlu menampilkannya kembali.
- **Login token kelas butuh migration `0009`.** Tanpa kolom `kelas.login_token`,
  `kelas.token_login_enabled`, dan `login_logs.method`, halaman `/guru/kelas` dan
  `/guru/log-login` akan error.
- **Halaman login siswa saat maintenance butuh migration `0010`.** Kolom
  `sessions.maintenance_access` menentukan sesi mana yang boleh membuka area siswa
  selama maintenance. Flag ini di-reset setiap status maintenance berubah; sesi lama
  harus login ulang lewat `/siswa-masuk/<token>`.
- **Login password siswa saat maintenance diizinkan.** Halaman `/login/siswa` tetap
  tertutup, tetapi Server Action `login` tidak lagi menolak; sesi yang dibuat saat
  maintenance mendapat flag akses. Maintenance bukan batas keamanan keras — kredensial
  (password/token kelas) tetap penentu.
- **Penyimpanan lokasi memakai route API, bukan Server Action di halaman login.**
  Setelah login berhasil, cookie sesi sudah aktif; Server Action yang dipanggil dari
  `/login/siswa` akan di-redirect middleware ke `/sesi` dan berakhir `405`. Karena itu
  client memanggil `POST /api/login-location` yang tidak terkena matcher middleware dan
  memvalidasi sesi sendiri.

## Pelajaran teknis

- **Audit data frontend (22 November 2026)**: bundle produksi tidak memuat
  `.env`, SQL, dump, atau source map; `public/` hanya ikon dan worker Pyodide.
  Solusi tugas asli tidak ditemukan di HTML/RSC/chunk halaman siswa (diuji
  dengan string solusi unik). API tidak mengembalikan data sensitif dan cookie
  sesi `httpOnly`. Draft kode di `localStorage` sekarang memakai user id dan
  key lama global dibersihkan otomatis. Data guru (jawaban, koordinat, kode
  pass) memang dikirim ke halaman guru dan dapat dilihat lewat DevTools jika
  sesi guru dipakai; akses tetap dilindungi role server.
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
