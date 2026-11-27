ALTER TABLE "tugas_links" ADD COLUMN "review_status" varchar(20) DEFAULT 'menunggu' NOT NULL;--> statement-breakpoint
ALTER TABLE "tugas_links" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "tugas_links" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tugas_links" ADD COLUMN "reviewed_by" integer;--> statement-breakpoint
ALTER TABLE "tugas_links" ADD CONSTRAINT "tugas_links_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;