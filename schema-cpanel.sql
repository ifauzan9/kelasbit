-- ============================================================
-- Portal Pembelajaran — Skema untuk PostgreSQL di hosting cPanel
--
-- Jalankan di database PostgreSQL cPanel (phpPgAdmin / psql).
-- Berbeda dari schema.sql (Supabase):
--   - tanpa Row Level Security, policy, dan GRANT khusus role Supabase
--   - tanpa Supabase Storage (berkas tugas sekarang di filesystem)
--   - akun guru disimpan di tabel guru_accounts (bukan auth.users)
--
-- Aman dijalankan berulang (idempoten).
-- ============================================================

-- ------------------------------------------------------------
-- FUNGSI UUID
--
-- PostgreSQL 10 belum punya gen_random_uuid() (baru bawaan sejak PG 13)
-- dan pgcrypto tidak tersedia di hosting ini. Fungsi di bawah menghasilkan
-- UUID versi 4 yang valid tanpa ekstensi apa pun.
-- ------------------------------------------------------------

create or replace function public.gen_random_uuid()
returns uuid
language sql
volatile
as $$
  -- Bangun UUID v4 lengkap (8-4-4-4-12 hex) lalu cast ke tipe uuid.
  -- md5() selalu menghasilkan tepat 32 karakter hex, jadi panjang tiap
  -- potongan dijamin benar (berbeda dari to_hex(bigint) yang bisa meleset).
  select (
    substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-'
    || substr(md5(random()::text || clock_timestamp()::text), 1, 4) || '-'
    || '4' || substr(md5(random()::text || clock_timestamp()::text), 2, 3) || '-'
    || substr('89ab', 1 + floor(random() * 4)::int, 1)
    || substr(md5(random()::text || clock_timestamp()::text), 2, 3) || '-'
    || substr(md5(random()::text || clock_timestamp()::text), 1, 12)
  )::uuid;
$$;

-- ------------------------------------------------------------
-- TABEL INTI
-- ------------------------------------------------------------

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  nama_kelas text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nama_siswa text not null,
  kelas_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.students add column if not exists nis text;
create unique index if not exists students_nis_unik on public.students (nis);

-- Akun login guru (pengganti Supabase Auth).
create table if not exists public.guru_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists guru_accounts_username_unik
  on public.guru_accounts (lower(username));

-- ------------------------------------------------------------
-- PENGUMUMAN
-- ------------------------------------------------------------

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  isi text not null,
  kelas_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.announcement_classes (
  pengumuman_id uuid references public.announcements(id) on delete cascade,
  kelas_id uuid references public.classes(id) on delete cascade,
  primary key (pengumuman_id, kelas_id)
);

-- ------------------------------------------------------------
-- ULANGAN
-- ------------------------------------------------------------

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  kelas_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Kolom tambahan (idempoten untuk database yang sudah ada).
alter table public.exams add column if not exists tanggal date;
alter table public.exams add column if not exists access_code text;
alter table public.exams add column if not exists status text not null default 'sudah';
alter table public.exams add column if not exists tenggat timestamptz;
alter table public.exams add column if not exists durasi integer;
alter table public.exams add column if not exists nilai_ditampilkan boolean not null default true;
alter table public.exams add column if not exists nilai_selesai boolean not null default false;
alter table public.exams add column if not exists dibuka boolean not null default true;

create table if not exists public.exam_scores (
  exam_id uuid references public.exams(id) on delete cascade,
  siswa_id uuid references public.students(id) on delete cascade,
  nilai numeric,
  primary key (exam_id, siswa_id)
);

create table if not exists public.exam_classes (
  ulangan_id uuid references public.exams(id) on delete cascade,
  kelas_id uuid references public.classes(id) on delete cascade,
  primary key (ulangan_id, kelas_id)
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  pertanyaan text,
  created_at timestamptz not null default now()
);

alter table public.exam_questions alter column pertanyaan drop not null;
alter table public.exam_questions add column if not exists soal text;
alter table public.exam_questions add column if not exists jenis text not null default 'pg';
alter table public.exam_questions add column if not exists pilihan text[];
alter table public.exam_questions add column if not exists kunci text;
alter table public.exam_questions add column if not exists poin integer not null default 1;
alter table public.exam_questions add column if not exists urutan integer not null default 0;

create table if not exists public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  siswa_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.exam_submissions add column if not exists nilai_pg numeric not null default 0;
alter table public.exam_submissions add column if not exists nilai_esai numeric not null default 0;
alter table public.exam_submissions add column if not exists nilai_total numeric;
alter table public.exam_submissions add column if not exists submitted_at timestamptz;

create unique index if not exists exam_submissions_unik
  on public.exam_submissions (exam_id, siswa_id);

create table if not exists public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.exam_submissions(id) on delete cascade,
  soal_id uuid not null references public.exam_questions(id) on delete cascade,
  jawaban text,
  created_at timestamptz not null default now()
);

create unique index if not exists exam_answers_unik
  on public.exam_answers (submission_id, soal_id);

create table if not exists public.exam_probes (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  siswa_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.exam_probes add column if not exists jenis text not null default 'mulai';

create table if not exists public.exam_essay_scores (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  siswa_id uuid not null references public.students(id) on delete cascade,
  soal_id uuid not null references public.exam_questions(id) on delete cascade,
  nilai numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_exam_essay_scores_exam
  on public.exam_essay_scores (exam_id);
create index if not exists idx_exam_essay_scores_siswa
  on public.exam_essay_scores (siswa_id);

-- ------------------------------------------------------------
-- AKUN SISWA
-- ------------------------------------------------------------

create table if not exists public.student_accounts (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid not null unique references public.students(id) on delete cascade,
  username text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.student_accounts add column if not exists is_active boolean not null default true;
create unique index if not exists student_accounts_username_unik
  on public.student_accounts (lower(username));

-- ------------------------------------------------------------
-- ABSENSI
-- ------------------------------------------------------------

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  kelas_id uuid not null references public.classes(id) on delete cascade,
  siswa_id uuid not null references public.students(id) on delete cascade,
  tanggal date not null default current_date,
  status text not null default 'hadir',
  created_at timestamptz not null default now()
);

-- Satu siswa hanya punya satu status per tanggal (dipakai "on conflict").
create unique index if not exists attendance_siswa_tanggal_unik
  on public.attendance (siswa_id, tanggal);

-- ------------------------------------------------------------
-- TUGAS (berkas sekarang di filesystem hosting)
-- ------------------------------------------------------------

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  deskripsi text,
  created_at timestamptz not null default now()
);

alter table public.assignments add column if not exists metode text not null default 'file';
alter table public.assignments add column if not exists file_diizinkan text[];
alter table public.assignments add column if not exists tenggat timestamptz;
alter table public.assignments add column if not exists dibuka boolean not null default true;
alter table public.assignments add column if not exists updated_at timestamptz not null default now();

create table if not exists public.assignment_classes (
  tugas_id uuid references public.assignments(id) on delete cascade,
  kelas_id uuid references public.classes(id) on delete cascade,
  primary key (tugas_id, kelas_id)
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  tugas_id uuid not null references public.assignments(id) on delete cascade,
  siswa_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.assignment_submissions add column if not exists jawaban text;
alter table public.assignment_submissions add column if not exists tautan text;
alter table public.assignment_submissions add column if not exists catatan text;
alter table public.assignment_submissions add column if not exists nilai numeric;
alter table public.assignment_submissions add column if not exists umpan_balik text;
alter table public.assignment_submissions add column if not exists dinilai_at timestamptz;
alter table public.assignment_submissions add column if not exists updated_at timestamptz not null default now();

create unique index if not exists assignment_submissions_unik
  on public.assignment_submissions (tugas_id, siswa_id);

create table if not exists public.assignment_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assignment_submissions(id) on delete cascade,
  nama_file text not null,
  path text not null,
  ukuran bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.assignment_files add column if not exists tipe text not null default 'dokumen';

-- ------------------------------------------------------------
-- LAB & KOMPUTER
-- ------------------------------------------------------------

create table if not exists public.coding_lessons (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  created_at timestamptz not null default now()
);

alter table public.coding_lessons add column if not exists urutan integer not null default 0;
alter table public.coding_lessons add column if not exists deskripsi text;

create table if not exists public.coding_exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.coding_lessons(id) on delete cascade,
  judul text not null,
  created_at timestamptz not null default now()
);

alter table public.coding_exercises add column if not exists instruksi text;
alter table public.coding_exercises add column if not exists kode_awal text;
alter table public.coding_exercises add column if not exists jawaban text;
alter table public.coding_exercises add column if not exists input_uji text;
alter table public.coding_exercises add column if not exists urutan integer not null default 0;
alter table public.coding_exercises add column if not exists level integer not null default 1;
alter table public.coding_exercises add column if not exists poin integer not null default 10;
alter table public.coding_exercises add column if not exists aturan jsonb;
alter table public.coding_exercises add column if not exists penjelasan text;
alter table public.coding_exercises add column if not exists contoh_kode text;
alter table public.coding_exercises add column if not exists keluaran_diharapkan text;
alter table public.coding_exercises add column if not exists jenis text not null default 'input';
alter table public.coding_exercises add column if not exists masukan text;
alter table public.coding_exercises add column if not exists masukan_uji text;
alter table public.coding_exercises add column if not exists keluaran_uji text;

create table if not exists public.coding_submissions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.coding_exercises(id) on delete cascade,
  siswa_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.coding_submissions add column if not exists kode text;
alter table public.coding_submissions add column if not exists keluaran text;
alter table public.coding_submissions add column if not exists benar boolean not null default false;
alter table public.coding_submissions add column if not exists pernah_benar boolean not null default false;
alter table public.coding_submissions add column if not exists percobaan integer not null default 0;
alter table public.coding_submissions add column if not exists updated_at timestamptz not null default now();

create unique index if not exists coding_submissions_unik
  on public.coding_submissions (exercise_id, siswa_id);

create table if not exists public.coding_lesson_classes (
  lesson_id uuid references public.coding_lessons(id) on delete cascade,
  kelas_id uuid references public.classes(id) on delete cascade,
  primary key (lesson_id, kelas_id)
);

create table if not exists public.komputer_lessons (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  created_at timestamptz not null default now()
);

alter table public.komputer_lessons add column if not exists urutan integer not null default 0;
alter table public.komputer_lessons add column if not exists deskripsi text;

create table if not exists public.komputer_challenges (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.komputer_lessons(id) on delete cascade,
  judul text not null,
  created_at timestamptz not null default now()
);

alter table public.komputer_challenges add column if not exists instruksi text;
alter table public.komputer_challenges add column if not exists poin integer not null default 10;
alter table public.komputer_challenges add column if not exists urutan integer not null default 0;
alter table public.komputer_challenges add column if not exists level integer not null default 1;
alter table public.komputer_challenges add column if not exists jenis text not null default 'klik';
alter table public.komputer_challenges add column if not exists penjelasan text;
alter table public.komputer_challenges add column if not exists contoh text;
alter table public.komputer_challenges add column if not exists konfigurasi jsonb not null default '{}'::jsonb;

create table if not exists public.komputer_hasil (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.komputer_challenges(id) on delete cascade,
  siswa_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.komputer_hasil add column if not exists benar boolean not null default false;
alter table public.komputer_hasil add column if not exists pernah_benar boolean not null default false;
alter table public.komputer_hasil add column if not exists percobaan integer not null default 0;
alter table public.komputer_hasil add column if not exists waktu_ms integer;
alter table public.komputer_hasil add column if not exists skor integer;
alter table public.komputer_hasil add column if not exists updated_at timestamptz not null default now();

create unique index if not exists komputer_hasil_unik
  on public.komputer_hasil (challenge_id, siswa_id);

create table if not exists public.komputer_lesson_classes (
  lesson_id uuid references public.komputer_lessons(id) on delete cascade,
  kelas_id uuid references public.classes(id) on delete cascade,
  primary key (lesson_id, kelas_id)
);

-- ------------------------------------------------------------
-- LOG LOGIN & TOKEN KELAS
-- ------------------------------------------------------------

create table if not exists public.login_logs (
  id uuid primary key default gen_random_uuid(),
  siswa_id uuid references public.students(id) on delete set null,
  username text,
  berhasil boolean not null default false,
  alasan text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.class_tokens (
  kelas_id uuid primary key references public.classes(id) on delete cascade,
  token text not null,
  diubah_at timestamptz not null default now()
);
