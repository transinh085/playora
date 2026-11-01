CREATE TABLE "counter_devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"label" text NOT NULL,
	"store_label" text,
	"pairing_code_hash" text,
	"pairing_expires_at" timestamp with time zone,
	"token_hash" text,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "redeemed_by_device_id" uuid;--> statement-breakpoint
ALTER TABLE "awards" ADD COLUMN "redeemed_store_label" text;--> statement-breakpoint
ALTER TABLE "counter_devices" ADD CONSTRAINT "counter_devices_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counter_devices" ADD CONSTRAINT "counter_devices_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "counter_devices_organization_id_index" ON "counter_devices" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "counter_devices_pairing_code_hash_index" ON "counter_devices" USING btree ("pairing_code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "counter_devices_token_hash_index" ON "counter_devices" USING btree ("token_hash");--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_redeemed_by_device_id_counter_devices_id_fk" FOREIGN KEY ("redeemed_by_device_id") REFERENCES "public"."counter_devices"("id") ON DELETE set null ON UPDATE no action;