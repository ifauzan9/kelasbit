# Instruksi Agent — Kelasbit

Next.js 15 (App Router) + PostgreSQL + Drizzle ORM, deploy ke cPanel via Node.js App
(Phusion Passenger, `output: "standalone"`).

## Memori penting: deploy & database

**Setiap kali user mau build, upload, migrasi, atau mengubah schema, baca
`DEPLOY.md` dan jalankan checklist-nya bersama user.** Jangan langsung build/upload.

Aturan yang tidak boleh dilanggar:

1. **Data DB lokal tidak pernah ikut ke produksi.** Lokal = Docker volume `db-data`,
   produksi = PostgreSQL cPanel. Deploy hanya mengirim `.next/standalone`.
2. **Jangan pernah menyarankan/menjalankan `db:push` untuk produksi.** Produksi hanya
   lewat migration di `drizzle/`.
3. **Backup DB produksi sebelum migrasi apa pun.** Ingatkan user secara eksplisit.
4. **Selalu ingatkan user membaca SQL hasil `db:generate`** sebelum diterapkan,
   terutama kalau ada `DROP TABLE` / `DROP COLUMN`.
5. **Jangan menyarankan import dump DB lokal ke cPanel.**
6. **Jangan upload `.env`.** Produksi memakai Environment Variables cPanel.
7. **Hati-hati dengan `DATABASE_URL` produksi.** Selama env itu aktif, perintah
   `db:migrate`, `db:seed`, dan Server Action menulis ke produksi. Uji fitur hanya
   dengan env lokal.
8. **Matikan `npm run dev` sebelum `npm run build`** — keduanya memakai `.next`.
9. **`npm run deploy:prepare` menyalin `public/`.** Kalau nanti ada fitur upload file,
   bersihkan file uji dari `public/` sebelum deploy.
10. **Simpan zip build sebelumnya** untuk rollback, dan ingatkan user **Restart**
    aplikasi di cPanel setelah extract (jangan *Run NPM Install*).

## Konvensi kode

- Bahasa UI dan dokumentasi: Indonesia.
- Server Actions di `src/lib/**/actions.ts`, query di `src/lib/**/queries.ts`.
- Schema Drizzle di `src/lib/db/schema.ts`; setelah diubah jalankan `npm run db:generate`.
- Ikuti pola komponen & penamaan yang sudah ada di `src/components/`.
- Catat fitur baru yang selesai di `PROGRESS.md`.

## Referensi

- `README.md` — setup lokal & deploy cPanel
- `DEPLOY.md` — checklist upload fitur baru (wajib sebelum deploy)
- `PROGRESS.md` — status pengerjaan
