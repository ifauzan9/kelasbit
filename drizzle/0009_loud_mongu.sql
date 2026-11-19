ALTER TABLE "kelas" ADD COLUMN "login_token" varchar(16);--> statement-breakpoint
ALTER TABLE "kelas" ADD COLUMN "token_login_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kelas" ADD COLUMN "token_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "login_logs" ADD COLUMN "method" varchar(20) DEFAULT 'password' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "kelas_login_token_idx" ON "kelas" USING btree ("login_token");