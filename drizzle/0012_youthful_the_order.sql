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
  ALTER TABLE "customer" ADD CONSTRAINT "customer_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "facility" ADD CONSTRAINT "facility_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;