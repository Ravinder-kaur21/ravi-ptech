ALTER TABLE "organization" ADD COLUMN "business_type" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "dot_number" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "mc_number" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "ein" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "address_line1" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "address_line2" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "country" text DEFAULT 'US';--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "default_currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "time_zone" text DEFAULT 'America/Chicago' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "fiscal_year_start" text DEFAULT '01-01' NOT NULL;