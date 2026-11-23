CREATE TABLE "tugas_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"tugas_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"url" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tugas" ADD COLUMN "link_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tugas_links" ADD CONSTRAINT "tugas_links_tugas_id_tugas_id_fk" FOREIGN KEY ("tugas_id") REFERENCES "public"."tugas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_links" ADD CONSTRAINT "tugas_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tugas_links_tugas_user_idx" ON "tugas_links" USING btree ("tugas_id","user_id");--> statement-breakpoint
CREATE INDEX "tugas_links_user_idx" ON "tugas_links" USING btree ("user_id");