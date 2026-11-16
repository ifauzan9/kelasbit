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
| `src/lib/db/schema.ts` | Schema Drizzle (tabel `users`, `sessions`, `materi`) |
| `src/app/(public)/` | Halaman publik: `/`, `/login*`, `/guru` — memakai header/footer situs |
| `src/app/(dashboard)/` | Area dashboard siswa — memakai shell sidebar + topbar sendiri |
| `src/app/(dashboard)/siswa/page.tsx` | Dashboard siswa (banner + kartu empty state) |
| `src/app/(public)/guru/page.tsx` | Dashboard guru (CRUD materi) |
| `src/lib/guru/actions.ts` | Server Actions CRUD materi: tambah, ubah, hapus |
| `src/lib/guru/queries.ts` | Query daftar materi |
| `src/components/guru/materi-manager.tsx` | Form tambah materi + daftar |
| `src/components/guru/materi-row.tsx` | Baris materi: edit inline dan hapus |
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

| Rute | Keterangan |
| --- | --- |
| `/login` | Pemilih peran (Siswa / Guru) |
| `/login/siswa` | Form login siswa |
| `/login/guru` | Form login guru |
| `/siswa` | Dashboard siswa — wajib login sebagai siswa |
| `/guru` | Dashboard guru — wajib login sebagai guru |
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
  "Email atau password salah." (role akun tidak dibocorkan).
- Logika ada di `src/lib/auth/` (`password.ts`, `session.ts`, `actions.ts`).

Buat akun demo:

```bash
npm run db:seed
```

| Email | Password | Role |
| --- | --- | --- |
| `siswa@kelasbit.id` | `siswa12345` | siswa |
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

```bash
npm run build
npm run deploy:prepare
```

Upload ulang isi `.next/standalone` (timpa file lama), lalu **Restart** aplikasi di
*Setup Node.js App*. Kalau ada migration baru, jalankan dulu lewat SSH tunnel sebelum restart.

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
