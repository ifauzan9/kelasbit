CREATE TABLE "tugas_gps_passes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tugas_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"code" varchar(12) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tugas_gps_passes" ADD CONSTRAINT "tugas_gps_passes_tugas_id_tugas_id_fk" FOREIGN KEY ("tugas_id") REFERENCES "public"."tugas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_gps_passes" ADD CONSTRAINT "tugas_gps_passes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tugas_gps_passes_tugas_user_idx" ON "tugas_gps_passes" USING btree ("tugas_id","user_id");--> statement-breakpoint
CREATE INDEX "tugas_gps_passes_code_idx" ON "tugas_gps_passes" USING btree ("code");