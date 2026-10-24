DROP TABLE "event_screens" CASCADE;--> statement-breakpoint
DROP TABLE "live_rounds" CASCADE;--> statement-breakpoint
DROP TABLE "round_scores" CASCADE;--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "mode";--> statement-breakpoint
DROP TYPE "public"."event_mode";--> statement-breakpoint
DROP TYPE "public"."round_status";