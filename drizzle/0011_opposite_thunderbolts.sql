CREATE TABLE IF NOT EXISTS "organization_role" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'USD';
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "sales_tax_type" varchar(20) DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "sales_tax_rate" varchar(20);
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "sales_tax_amount" varchar(20);
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "final_rate" varchar(50);
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "tender_number" varchar(100);
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "stops" text;
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "temperature" varchar(50);
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "is_refrigerated" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "load" ADD COLUMN IF NOT EXISTS "special_instructions" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_role_organization_id_idx" ON "organization_role" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_role_role_idx" ON "organization_role" USING btree ("role");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_role_pk_idx" ON "organization_role" USING btree ("organization_id","role");