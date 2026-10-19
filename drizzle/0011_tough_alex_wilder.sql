ALTER TABLE "invitation" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "invitation_method" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "recipient_phone" text;--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_pending_phone_unique_idx" ON "invitation" USING btree ("organization_id","recipient_phone") WHERE invitation_method = 'whatsapp' AND status = 'pending' AND recipient_phone IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_recipient_method_check" CHECK (("invitation_method" = 'email' AND "email" IS NOT NULL) OR ("invitation_method" = 'whatsapp' AND "email" IS NULL AND "recipient_phone" IS NOT NULL));