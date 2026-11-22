CREATE TABLE "tugas_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tugas_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"accuracy" double precision,
	"status" varchar(20) DEFAULT 'tidak_dicatat' NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tugas" ADD COLUMN "require_gps" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tugas_locations" ADD CONSTRAINT "tugas_locations_tugas_id_tugas_id_fk" FOREIGN KEY ("tugas_id") REFERENCES "public"."tugas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_locations" ADD CONSTRAINT "tugas_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tugas_locations_user_captured_idx" ON "tugas_locations" USING btree ("user_id","captured_at");--> statement-breakpoint
CREATE INDEX "tugas_locations_tugas_user_captured_idx" ON "tugas_locations" USING btree ("tugas_id","user_id","captured_at");