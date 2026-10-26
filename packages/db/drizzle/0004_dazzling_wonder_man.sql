CREATE TYPE "public"."play_outcome" AS ENUM('win', 'lose', 'closed');--> statement-breakpoint
CREATE TABLE "play_counters" (
	"organization_id" text NOT NULL,
	"player_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"day" text NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "play_counters_player_id_game_id_day_pk" PRIMARY KEY("player_id","game_id","day")
);
--> statement-breakpoint
CREATE TABLE "plays" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"game_version_id" uuid,
	"player_id" uuid NOT NULL,
	"env" "data_env" DEFAULT 'live' NOT NULL,
	"request_id" text NOT NULL,
	"channel_key" text,
	"outcome" "play_outcome" NOT NULL,
	"reason" text NOT NULL,
	"prize_id" uuid,
	"rng_proof" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "schedule" jsonb;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "participation" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "anti_fraud" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "session_ver" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "play_id" uuid;--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "env" "data_env" DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "redeemed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "redeemed_by" text;--> statement-breakpoint
ALTER TABLE "prizes" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "prizes" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "play_counters" ADD CONSTRAINT "play_counters_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_counters" ADD CONSTRAINT "play_counters_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_counters" ADD CONSTRAINT "play_counters_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_game_version_id_game_versions_id_fk" FOREIGN KEY ("game_version_id") REFERENCES "public"."game_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_prize_id_prizes_id_fk" FOREIGN KEY ("prize_id") REFERENCES "public"."prizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plays_player_id_request_id_index" ON "plays" USING btree ("player_id","request_id");--> statement-breakpoint
CREATE INDEX "plays_event_id_env_created_at_index" ON "plays" USING btree ("event_id","env","created_at");--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_redeemed_by_user_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "awards_organization_id_redeem_code_index" ON "awards" USING btree ("organization_id","redeem_code");--> statement-breakpoint
CREATE UNIQUE INDEX "awards_play_id_index" ON "awards" USING btree ("play_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prizes_game_id_key_index" ON "prizes" USING btree ("game_id","key");