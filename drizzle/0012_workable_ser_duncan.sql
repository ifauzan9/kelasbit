CREATE TABLE "tugas" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"jenis" varchar(20) DEFAULT 'tugas' NOT NULL,
	"kelas_id" integer,
	"starter_code" text DEFAULT '' NOT NULL,
	"expected_output" text DEFAULT '' NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tugas_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tugas_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"code" text NOT NULL,
	"stdin" text DEFAULT '' NOT NULL,
	"stdout" text DEFAULT '' NOT NULL,
	"stderr" text DEFAULT '' NOT NULL,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"score" integer,
	"feedback" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"graded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_submissions" ADD CONSTRAINT "tugas_submissions_tugas_id_tugas_id_fk" FOREIGN KEY ("tugas_id") REFERENCES "public"."tugas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas_submissions" ADD CONSTRAINT "tugas_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tugas_kelas_idx" ON "tugas" USING btree ("kelas_id");--> statement-breakpoint
CREATE INDEX "tugas_created_idx" ON "tugas" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tugas_submissions_tugas_idx" ON "tugas_submissions" USING btree ("tugas_id","user_id");--> statement-breakpoint
CREATE INDEX "tugas_submissions_user_idx" ON "tugas_submissions" USING btree ("user_id");