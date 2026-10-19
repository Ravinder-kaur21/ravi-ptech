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
  ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_role_organization_id_idx" ON "organization_role" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_role_role_idx" ON "organization_role" USING btree ("role");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_role_pk_idx" ON "organization_role" USING btree ("organization_id","role");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255),
  "phone" varchar(50),
  "contact_name" varchar(100),
  "address" text,
  "city" varchar(100),
  "state" varchar(50),
  "country" varchar(10) DEFAULT 'US',
  "zip" varchar(20),
  "payment_terms" varchar(50) DEFAULT 'Net 30',
  "currency" varchar(10) DEFAULT 'USD',
  "credit_limit" varchar(50),
  "status" varchar(50) DEFAULT 'active' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "facility" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "name" varchar(255) NOT NULL,
  "facility_type" varchar(50) DEFAULT 'shipper_receiver',
  "address" text NOT NULL,
  "city" varchar(100) NOT NULL,
  "state" varchar(50) NOT NULL,
  "country" varchar(10) DEFAULT 'US',
  "zip" varchar(20),
  "contact_name" varchar(100),
  "contact_phone" varchar(50),
  "operating_hours" varchar(100),
  "appointment_required" boolean DEFAULT true,
  "check_in_instructions" text,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer" ADD CONSTRAINT "customer_tenant_id_organization_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "facility" ADD CONSTRAINT "facility_tenant_id_organization_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "user_id" text,
  "category" text NOT NULL,
  "event" text NOT NULL,
  "severity" text DEFAULT 'info' NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "link" text,
  "read" boolean DEFAULT false NOT NULL,
  "read_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preference" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "category" text NOT NULL,
  "in_app" boolean DEFAULT true NOT NULL,
  "browser_push" boolean DEFAULT true NOT NULL,
  "email" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification" ADD CONSTRAINT "notification_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_org_created_idx" ON "notification" USING btree ("organization_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_user_read_idx" ON "notification" USING btree ("user_id","read");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_category_idx" ON "notification" USING btree ("organization_id","category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notif_pref_user_org_idx" ON "notification_preference" USING btree ("user_id","organization_id","category");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "name" varchar(255) NOT NULL,
  "mc_number" varchar(50),
  "dot_number" varchar(50),
  "contact_name" varchar(100),
  "email" varchar(255),
  "phone" varchar(50),
  "address" text,
  "city" varchar(100),
  "state" varchar(50),
  "country" varchar(10) DEFAULT 'US',
  "zip" varchar(20),
  "tax_id" varchar(50),
  "payment_terms" varchar(50) DEFAULT 'Net 30',
  "currency" varchar(10) DEFAULT 'USD',
  "insurance_expiry" timestamp,
  "status" varchar(50) DEFAULT 'active' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN IF NOT EXISTS "carrier_id" text;
--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN IF NOT EXISTS "additions" varchar(50) DEFAULT '0';
--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN IF NOT EXISTS "deductions" varchar(50) DEFAULT '0';
--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN IF NOT EXISTS "net_amount" varchar(50);
--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'USD';
--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN IF NOT EXISTS "invoice_number" varchar(100);
--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN IF NOT EXISTS "reference_number" varchar(100);
--> statement-breakpoint
ALTER TABLE "trip" ADD COLUMN IF NOT EXISTS "carrier_id" text;
--> statement-breakpoint
ALTER TABLE "trip" ADD COLUMN IF NOT EXISTS "carrier_rate" varchar(50);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "carrier" ADD CONSTRAINT "carrier_tenant_id_organization_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "carrier_payment" ADD CONSTRAINT "carrier_payment_carrier_id_carrier_id_fk"
    FOREIGN KEY ("carrier_id") REFERENCES "public"."carrier"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "trip" ADD CONSTRAINT "trip_carrier_id_carrier_id_fk"
    FOREIGN KEY ("carrier_id") REFERENCES "public"."carrier"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
