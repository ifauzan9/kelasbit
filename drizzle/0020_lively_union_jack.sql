CREATE TABLE "tugas_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tugas_id" integer NOT NULL,
	"order_no" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starter_code" text DEFAULT '' NOT NULL,
	"expected_output" text DEFAULT '' NOT NULL,
	"solution_code" text DEFAULT '' NOT NULL,
	"max_score" integer DEFAULT 5 NOT NULL,
	"structure_rules" jsonb,
	"structure_weight" integer DEFAULT 40 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tugas_submissions" ADD COLUMN "question_id" integer;--> statement-breakpoint
ALTER TABLE "tugas_questions" ADD CONSTRAINT "tugas_questions_tugas_id_tugas_id_fk" FOREIGN KEY ("tugas_id") REFERENCES "public"."tugas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tugas_questions_tugas_order_idx" ON "tugas_questions" USING btree ("tugas_id","order_no");--> statement-breakpoint
CREATE INDEX "tugas_questions_tugas_idx" ON "tugas_questions" USING btree ("tugas_id");--> statement-breakpoint
ALTER TABLE "tugas_submissions" ADD CONSTRAINT "tugas_submissions_question_id_tugas_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."tugas_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tugas_submissions_question_idx" ON "tugas_submissions" USING btree ("question_id","user_id");