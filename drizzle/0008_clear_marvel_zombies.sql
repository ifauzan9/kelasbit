CREATE TABLE "app_settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "login_logs" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "login_logs" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "login_logs" ADD COLUMN "accuracy" double precision;--> statement-breakpoint
ALTER TABLE "login_logs" ADD COLUMN "location_status" varchar(20) DEFAULT 'tidak_dicatat' NOT NULL;