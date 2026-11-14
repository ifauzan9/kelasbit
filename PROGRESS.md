# Status Pengerjaan

Terakhir diperbarui: 14 November 2026

## Yang sudah jadi

- Setup project: Next.js 15.5 (App Router) + Tailwind v4 + Drizzle ORM + `pg`
- Konfigurasi deploy cPanel (`output: "standalone"`, `serverExternalPackages: ["pg"]`, image unoptimized)
- Database lokal via Docker Compose (Postgres 17, container `kelasbit-db`)
- `src/lib/db/schema.ts` — tabel `users` (id, name, email, created_at)
- `src/lib/db/index.ts` — pool `pg` lazy + instance Drizzle
- `src/app/api/health/route.ts` — health check, sudah diverifikasi `{"status":"ok","db":true}`
- Migration `drizzle/0000_stormy_giant_girl.sql` — sudah diterapkan ke DB lokal
- Landing page: `src/app/page.tsx`, `src/components/site-header.tsx`, `site-footer.tsx`, `icons.tsx`, `globals.css`
- `README.md` — panduan dev lokal (Docker) + deploy cPanel
- `scripts/prepare-deploy.mjs` — menyalin `public` + `.next/static` ke bundle standalone

## Yang belum dikerjakan

1. **Halaman `/login` belum ada.** Tombol "Login Siswa" di header sudah menuju `/login`, tapi file-nya belum dibuat sehingga masih 404.
2. **Sistem auth belum ada.** Tabel `users` belum punya kolom password; belum ada hashing, session, maupun cookie.
3. **Halaman materi/dashboard siswa belum ada.**

## Cara lanjut di sesi berikutnya

```bash
docker compose up -d     # nyalakan Postgres
npm run dev              # jalankan app
```

- App: http://localhost:3000 (pindah ke 3001 bila port 3000 terpakai)
- Health check: http://localhost:3000/api/health
- Cek DB: `docker exec -it kelasbit-db psql -U kelasbit -d kelasbit`

## Catatan

- Project ini **belum memakai git**. Disarankan `git init` agar tiap perubahan aman di-rollback.
- Port 3000 di laptop dipakai project Next.js lain ("Portal Pembelajaran"), jadi app ini sering jalan di 3001.
- Data lokal tersimpan di volume Docker `kelasbit_v2_db-data`. Jangan jalankan `docker compose down -v` kecuali memang ingin mengosongkan database.
