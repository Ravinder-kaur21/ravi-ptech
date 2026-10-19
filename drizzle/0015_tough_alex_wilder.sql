ALTER TABLE "invitation" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "invitation_method" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "recipient_phone" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invitation_pending_phone_unique_idx" ON "invitation" USING btree ("organization_id","recipient_phone") WHERE invitation_method = 'whatsapp' AND status = 'pending' AND recipient_phone IS NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "invitation" ADD CONSTRAINT "invitation_recipient_method_check"
    CHECK (("invitation_method" = 'email' AND "email" IS NOT NULL) OR ("invitation_method" = 'whatsapp' AND "email" IS NULL AND "recipient_phone" IS NOT NULL));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;