ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar(60);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Backfill username untuk akun lama: demo siswa memakai "siswa", sisanya "user<id>".
UPDATE "users" SET "username" = split_part("email", '@', 1) WHERE "username" IS NULL AND "email" = 'siswa@kelasbit.id';--> statement-breakpoint
UPDATE "users" SET "username" = 'user' || "id" WHERE "username" IS NULL AND "email" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
