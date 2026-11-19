import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const kelas = pgTable(
  "kelas",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 40 }).notNull(),
    academicYear: varchar("academic_year", { length: 9 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("kelas_name_academic_year_idx").on(table.name, table.academicYear),
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

export type LoginLogReason =
  | "password_salah"
  | "akun_tidak_ditemukan"
  | "bukan_akun_siswa"
  | "akun_nonaktif"
  | "rate_limit";

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Materi = typeof materi.$inferSelect;
export type NewMateri = typeof materi.$inferInsert;
export type Kelas = typeof kelas.$inferSelect;
export type NewKelas = typeof kelas.$inferInsert;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type LoginLog = typeof loginLogs.$inferSelect;
export type NewLoginLog = typeof loginLogs.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;

export type Siswa = User;
