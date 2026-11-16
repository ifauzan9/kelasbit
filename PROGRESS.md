# Status Pengerjaan

Terakhir diperbarui: 16 November 2026

## Yang sudah jadi

- Setup project: Next.js 15.5 (App Router) + Tailwind v4 + Drizzle ORM + `pg`
- Konfigurasi deploy cPanel (`output: "standalone"`, `serverExternalPackages: ["pg"]`, image unoptimized)
- Database lokal via Docker Compose (Postgres 17, container `kelasbit-db`)
- `src/lib/db/index.ts` — pool `pg` lazy + instance Drizzle
- `src/app/api/health/route.ts` — health check, terverifikasi `{"status":"ok","db":true}`
- Landing page: `src/app/page.tsx`, `src/components/site-header.tsx`, `site-footer.tsx`, `icons.tsx`, `globals.css`
- `README.md` — panduan dev lokal (Docker) + deploy cPanel
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
  - `siswa@kelasbit.id` / `siswa12345` (role siswa)
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
| `/sesi` | Route handler: arahkan ke dashboard sesuai role (dipakai middleware) |
| `/api/health` | Health check + tes koneksi DB |

Aturan akses:

- Belum login dan cookie sesi tidak ada → middleware langsung 307 ke `/login/<role>`
- Sudah login buka `/login*` → middleware 307 ke `/sesi` → dashboard sesuai role
- Role salah (guru buka `/siswa`) → middleware 307 ke `/sesi` → dashboard role-nya
- Login di halaman role yang salah (mis. akun guru di `/login/siswa`) → ditolak dengan
  pesan umum "Email atau password salah." (tidak membocorkan role akun)
- `/dashboard` lama sudah dihapus; sekarang `/siswa` dan `/guru`

Middleware (`src/middleware.ts`) hanya memeriksa **keberadaan** cookie (`kelasbit_session`
dan `kelasbit_role`) supaya redirect tetap instan. Otorisasi sebenarnya tetap di server
lewat `requireUser(role)` yang memvalidasi sesi ke database.

### Dashboard siswa

- Route group `(public)` untuk halaman publik (`/`, `/login*`, `/guru`) dengan header/footer situs.
- Route group `(dashboard)` untuk area siswa, memakai shell sendiri lewat
  `src/components/dashboard/dashboard-shell.tsx` (sidebar nav + topbar + profil + logout).
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
- `loading.tsx` per rute (`/`, `/login`, `/login/siswa`, `/login/guru`, `/siswa`, `/guru`) —
  skeleton dengan shimmer yang meniru bentuk layout aslinya.
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
   sudah punya CRUD materi; pengelolaan kelas, tugas, dan nilai belum dibuat.
2. **Belum ada registrasi** — akun hanya lewat `npm run db:seed`.
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
