CREATE TABLE "tugas_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"tugas_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tugas" ADD COLUMN "target_type" varchar(20) DEFAULT 'semua' NOT NULL;--> statement-breakpoint
UPDATE "tugas" SET "target_type" = 'kelas' WHERE "kelas_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "tugas_targets" ADD CONSTRAINT "tugas_targets_tugas_id_tugas_id_fk" FOREIGN KEY ("tugas_id") REFERENCES "public"."tugas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_targets" ADD CONSTRAINT "tugas_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tugas_targets_tugas_user_idx" ON "tugas_targets" USING btree ("tugas_id","user_id");--> statement-breakpoint
CREATE INDEX "tugas_targets_user_idx" ON "tugas_targets" USING btree ("user_id");