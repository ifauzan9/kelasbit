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
| `src/lib/db/schema.ts` | Schema Drizzle (contoh tabel `users`) |
| `drizzle/` | SQL migration hasil `npm run db:generate` |
| `drizzle.config.ts` | Konfigurasi drizzle-kit |
| `docker-compose.yml` | PostgreSQL lokal untuk development |
| `scripts/prepare-deploy.mjs` | Menyalin `public` + `.next/static` ke bundle standalone |

Setelah mengubah schema:

```bash
npm run db:generate   # buat file SQL baru di drizzle/
```

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
`server.js`, `node_modules` minimal, `public/`, dan `.next/static/`.

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
psql -h localhost -U USER_DB -d USER_DB -f drizzle/0000_*.sql
```

**B. phpPgAdmin** — buka database → Import → pilih file SQL dari folder `drizzle/`.

**C. Remote dari lokal** — minta hosting mengizinkan IP kamu di PostgreSQL, lalu:

```bash
DATABASE_URL="postgresql://USER:PASS@IP_SERVER:5432/DB" npm run db:migrate
```

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

Upload ulang isi `.next/standalone` (timpa file lama), lalu **Restart** aplikasi di *Setup Node.js App*.

## Catatan

- `next/image` diset `unoptimized` karena binary `sharp` bersifat platform-specific; build di Windows tidak kompatibel dijalankan di Linux cPanel.
- Jangan upload `.env`; gunakan **Environment Variables** di cPanel (bundle standalone tidak membaca `.env`).
- Pool database dibatasi `max: 5` karena shared hosting membatasi jumlah koneksi.
- PostgreSQL harus di `localhost` (port 5432 keluar biasanya diblokir firewall shared hosting).
- Peringatan `@next/swc-win32-x64-msvc blocked` saat build di Windows hanya memicu fallback WASM; build tetap berhasil.
- `npm audit --omit=dev` → 0 vulnerabilities. Sisa temuan hanya di dev tooling (`drizzle-kit`/`esbuild`).
