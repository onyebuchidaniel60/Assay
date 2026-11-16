ALTER TABLE "reppo_evaluations" ADD COLUMN "provider_status" text;--> statement-breakpoint
ALTER TABLE "reppo_evaluations" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "reppo_evaluations" ADD COLUMN "credits_charged" integer;--> statement-breakpoint
ALTER TABLE "reppo_evaluations" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "reppo_evaluations" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "reppo_evaluations" ADD COLUMN "max_wait_minutes" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "reppo_evaluations" ADD COLUMN "last_polled_at" timestamp with time zone;