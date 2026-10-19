CREATE TABLE "carrier" (
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
ALTER TABLE "carrier_payment" ADD COLUMN "carrier_id" text;--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN "additions" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN "deductions" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN "net_amount" varchar(50);--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN "currency" varchar(10) DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN "invoice_number" varchar(100);--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD COLUMN "reference_number" varchar(100);--> statement-breakpoint
ALTER TABLE "trip" ADD COLUMN "carrier_id" text;--> statement-breakpoint
ALTER TABLE "trip" ADD COLUMN "carrier_rate" varchar(50);--> statement-breakpoint
ALTER TABLE "carrier" ADD CONSTRAINT "carrier_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_payment" ADD CONSTRAINT "carrier_payment_carrier_id_carrier_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carrier"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip" ADD CONSTRAINT "trip_carrier_id_carrier_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carrier"("id") ON DELETE no action ON UPDATE no action;