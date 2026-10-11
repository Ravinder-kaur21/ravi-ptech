CREATE TABLE "announcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"kind" text DEFAULT 'info' NOT NULL,
	"scope" text DEFAULT 'global' NOT NULL,
	"organization_id" text,
	"dismissible" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_broadcast" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"audience" text NOT NULL,
	"audience_size" text NOT NULL,
	"sent_count" text DEFAULT '0' NOT NULL,
	"failed_count" text DEFAULT '0' NOT NULL,
	"batch_id" text,
	"sent_by" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"kind" text DEFAULT 'transactional' NOT NULL,
	"provider_id" text,
	"success" boolean NOT NULL,
	"error" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_broadcast" ADD CONSTRAINT "email_broadcast_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_scope_idx" ON "announcement" USING btree ("scope","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "email_broadcast_sentAt_idx" ON "email_broadcast" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "email_log_to_idx" ON "email_log" USING btree ("to_email");--> statement-breakpoint
CREATE INDEX "email_log_sentAt_idx" ON "email_log" USING btree ("sent_at");