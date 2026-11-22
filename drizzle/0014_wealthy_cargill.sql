ALTER TABLE "tugas" ADD COLUMN "min_score" integer;--> statement-breakpoint
ALTER TABLE "tugas" ADD COLUMN "repeat_until_pass" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tugas" ADD COLUMN "structure_rules" jsonb;--> statement-breakpoint
ALTER TABLE "tugas" ADD COLUMN "structure_weight" integer DEFAULT 40 NOT NULL;--> statement-breakpoint
ALTER TABLE "tugas_submissions" ADD COLUMN "output_score" integer;--> statement-breakpoint
ALTER TABLE "tugas_submissions" ADD COLUMN "structure_score" integer;--> statement-breakpoint
ALTER TABLE "tugas_submissions" ADD COLUMN "passed" boolean;--> statement-breakpoint
ALTER TABLE "tugas_submissions" ADD COLUMN "metrics" jsonb;--> statement-breakpoint
ALTER TABLE "tugas_submissions" ADD COLUMN "checks" jsonb;