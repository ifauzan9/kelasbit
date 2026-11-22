import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  TugasCheck,
  TugasMetrics,
  TugasStructureRules,
} from "@/lib/tugas/rules";

export const kelas = pgTable(
  "kelas",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 40 }).notNull(),
    academicYear: varchar("academic_year", { length: 9 }).notNull(),
    /** Token login bersama untuk satu kelas (uppercase, tanpa karakter ambigu). */
    loginToken: varchar("login_token", { length: 16 }),
    /** Guru bisa menyalakan/mematikan login token tanpa menghapus tokennya. */
    tokenLoginEnabled: boolean("token_login_enabled").notNull().default(false),
    tokenUpdatedAt: timestamp("token_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("kelas_name_academic_year_idx").on(table.name, table.academicYear),
    uniqueIndex("kelas_login_token_idx").on(table.loginToken),
  ],
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).unique(),
    username: varchar("username", { length: 60 }).unique(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("siswa"),
    isActive: boolean("is_active").notNull().default(true),
    kelasId: integer("kelas_id").references(() => kelas.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_kelas_id_idx").on(table.kelasId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Sesi siswa yang login lewat halaman khusus saat maintenance. */
    maintenanceAccess: boolean("maintenance_access").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export type Role = "siswa" | "guru";

/**
 * Catatan percobaan login yang gagal, dipakai rate limiter.
 * Identifier dan IP disimpan sebagai hash supaya tidak menyimpan data mentah.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    identifierHash: varchar("identifier_hash", { length: 64 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("login_attempts_identifier_idx").on(table.identifierHash, table.createdAt),
    index("login_attempts_ip_idx").on(table.ipHash, table.createdAt),
    index("login_attempts_created_at_idx").on(table.createdAt),
  ],
);

export type LoginLogStatus = "berhasil" | "gagal" | "diblokir";

export type LoginLogMethod = "password" | "token_kelas";

export type LoginLogReason =
  | "password_salah"
  | "akun_tidak_ditemukan"
  | "bukan_akun_siswa"
  | "akun_nonaktif"
  | "rate_limit"
  | "token_salah"
  | "token_nonaktif"
  | "token_global_off"
  | "kelas_tanpa_siswa"
  | "siswa_tidak_ada";

/**
 * Riwayat percobaan login siswa (berhasil, gagal, dan diblokir).
 * Nama dan kelas disimpan sebagai snapshot agar riwayat tetap terbaca
 * meskipun data siswa berubah atau dihapus.
 */
export const loginLogs = pgTable(
  "login_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: varchar("user_name", { length: 120 }),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("siswa"),
    status: varchar("status", { length: 20 }).notNull(),
    /** Metode login: password biasa atau token kelas. */
    method: varchar("method", { length: 20 }).notNull().default("password"),
    reason: varchar("reason", { length: 40 }),
    kelasName: varchar("kelas_name", { length: 40 }),
    academicYear: varchar("academic_year", { length: 9 }),
    ip: varchar("ip", { length: 45 }),
    userAgent: text("user_agent"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    accuracy: doublePrecision("accuracy"),
    locationStatus: varchar("location_status", { length: 20 })
      .notNull()
      .default("tidak_dicatat"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("login_logs_created_at_idx").on(table.createdAt),
    index("login_logs_user_id_idx").on(table.userId),
    index("login_logs_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

/** Pengaturan aplikasi sederhana (key-value), mis. toggle lacak lokasi login. */
export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const materi = pgTable("materi", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull().default(""),
  subject: varchar("subject", { length: 40 }).notNull().default("Informatika"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Riwayat eksekusi Lab Coding Python. Satu baris per tombol Run.
 * Output dibatasi di Server Action supaya database tidak membengkak.
 */
export const labRuns = pgTable(
  "lab_runs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    stdin: text("stdin").notNull().default(""),
    stdout: text("stdout").notNull().default(""),
    stderr: text("stderr").notNull().default(""),
    status: varchar("status", { length: 20 }).notNull().default("success"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("lab_runs_user_created_idx").on(table.userId, table.createdAt),
  ],
);

/** Tugas/ulangan/remedial, termasuk tugas coding. */
export const tugas = pgTable(
  "tugas",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull().default(""),
    /** tugas | ulangan | remedial */
    jenis: varchar("jenis", { length: 20 }).notNull().default("tugas"),
    /** semua | kelas | siswa */
    targetType: varchar("target_type", { length: 20 })
      .notNull()
      .default("semua"),
    /** null = berlaku untuk semua kelas / siswa tertentu. */
    kelasId: integer("kelas_id").references(() => kelas.id, {
      onDelete: "set null",
    }),
    starterCode: text("starter_code").notNull().default(""),
    /** Output yang diharapkan untuk auto-grade; kosong = nilai manual. */
    expectedOutput: text("expected_output").notNull().default(""),
    /** Kunci jawaban berupa kode, hanya ditampilkan ke guru. */
    solutionCode: text("solution_code").notNull().default(""),
    maxScore: integer("max_score").notNull().default(100),
    maxAttempts: integer("max_attempts").notNull().default(3),
    /** KKM; null = tanpa ambang kelulusan. */
    minScore: integer("min_score"),
    /** Jika true, percobaan tidak dibatasi sampai nilai >= minScore. */
    repeatUntilPass: boolean("repeat_until_pass").notNull().default(false),
    /** Aturan struktur AST + bobotnya. */
    structureRules: jsonb("structure_rules").$type<TugasStructureRules | null>(),
    structureWeight: integer("structure_weight").notNull().default(40),
    /** Blokir copy, cut, paste, dan drag-drop di editor tugas siswa. */
    blockCopyPaste: boolean("block_copy_paste").notNull().default(false),
    /** Ditutup manual oleh guru; berbeda dari deadline. */
    manuallyClosed: boolean("manually_closed").notNull().default(false),
    /** Wajibkan GPS untuk masuk halaman tugas dan submit. */
    requireGps: boolean("require_gps").notNull().default(false),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tugas_kelas_idx").on(table.kelasId),
    index("tugas_created_idx").on(table.createdAt),
  ],
);

/** Satu baris per siswa yang ditargetkan (target_type = siswa). */
export const tugasTargets = pgTable(
  "tugas_targets",
  {
    id: serial("id").primaryKey(),
    tugasId: integer("tugas_id")
      .notNull()
      .references(() => tugas.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("tugas_targets_tugas_user_idx").on(table.tugasId, table.userId),
    index("tugas_targets_user_idx").on(table.userId),
  ],
);

/** Riwayat titik lokasi saat siswa membuka/mengerjakan tugas. */
export const tugasLocations = pgTable(
  "tugas_locations",
  {
    id: serial("id").primaryKey(),
    tugasId: integer("tugas_id")
      .notNull()
      .references(() => tugas.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    accuracy: doublePrecision("accuracy"),
    status: varchar("status", { length: 20 }).notNull().default("tidak_dicatat"),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tugas_locations_user_captured_idx").on(
      table.userId,
      table.capturedAt,
    ),
    index("tugas_locations_tugas_user_captured_idx").on(
      table.tugasId,
      table.userId,
      table.capturedAt,
    ),
  ],
);

/** Satu baris per percobaan pengumpulan tugas coding. */
export const tugasSubmissions = pgTable(  "tugas_submissions",
  {
    id: serial("id").primaryKey(),
    tugasId: integer("tugas_id")
      .notNull()
      .references(() => tugas.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull().default(1),
    code: text("code").notNull(),
    stdin: text("stdin").notNull().default(""),
    stdout: text("stdout").notNull().default(""),
    stderr: text("stderr").notNull().default(""),
    status: varchar("status", { length: 20 }).notNull().default("success"),
    /** null = belum dinilai (mis. expected output kosong). */
    score: integer("score"),
    outputScore: integer("output_score"),
    structureScore: integer("structure_score"),
    passed: boolean("passed"),
    metrics: jsonb("metrics").$type<TugasMetrics | null>(),
    checks: jsonb("checks").$type<TugasCheck[] | null>(),
    feedback: text("feedback"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
  },
  (table) => [
    index("tugas_submissions_tugas_idx").on(table.tugasId, table.userId),
    index("tugas_submissions_user_idx").on(table.userId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Materi = typeof materi.$inferSelect;
export type NewMateri = typeof materi.$inferInsert;
export type Kelas = typeof kelas.$inferSelect;
export type NewKelas = typeof kelas.$inferInsert;
export type LabRunStatus = "success" | "error" | "timeout" | "stopped";
export type LabRun = typeof labRuns.$inferSelect;
export type Tugas = typeof tugas.$inferSelect;
export type TugasSubmission = typeof tugasSubmissions.$inferSelect;
export type TugasJenis = "tugas" | "ulangan" | "remedial";
export type TugasTargetType = "semua" | "kelas" | "siswa";
export type TugasTarget = typeof tugasTargets.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type LoginLog = typeof loginLogs.$inferSelect;
export type NewLoginLog = typeof loginLogs.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;

export type Siswa = User;
