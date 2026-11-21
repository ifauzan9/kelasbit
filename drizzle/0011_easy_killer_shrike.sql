CREATE TABLE "lab_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"stdin" text DEFAULT '' NOT NULL,
	"stdout" text DEFAULT '' NOT NULL,
	"stderr" text DEFAULT '' NOT NULL,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_runs_user_created_idx" ON "lab_runs" USING btree ("user_id","created_at");