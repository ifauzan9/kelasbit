ALTER TABLE "users" ADD COLUMN "kelas_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_kelas_id_idx" ON "users" USING btree ("kelas_id");