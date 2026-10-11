CREATE TABLE "email_allowlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_allowlist_pattern_unique" UNIQUE("pattern")
);
--> statement-breakpoint
CREATE TABLE "email_blocklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_blocklist_pattern_unique" UNIQUE("pattern")
);
--> statement-breakpoint
CREATE TABLE "ip_allowlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cidr" text NOT NULL,
	"label" text,
	"expires_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ip_allowlist_cidr_unique" UNIQUE("cidr")
);
--> statement-breakpoint
CREATE TABLE "signup_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"success" boolean NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_allowlist" ADD CONSTRAINT "email_allowlist_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_blocklist" ADD CONSTRAINT "email_blocklist_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_allowlist" ADD CONSTRAINT "ip_allowlist_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_setting" ADD CONSTRAINT "system_setting_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_allowlist_pattern_idx" ON "email_allowlist" USING btree ("pattern");--> statement-breakpoint
CREATE INDEX "email_blocklist_pattern_idx" ON "email_blocklist" USING btree ("pattern");--> statement-breakpoint
CREATE INDEX "ip_allowlist_cidr_idx" ON "ip_allowlist" USING btree ("cidr");--> statement-breakpoint
CREATE INDEX "signup_attempt_created_idx" ON "signup_attempt" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "signup_attempt_ip_idx" ON "signup_attempt" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "signup_attempt_email_idx" ON "signup_attempt" USING btree ("email");