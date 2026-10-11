CREATE TYPE "public"."appeal_status" AS ENUM('open', 'approved', 'denied');--> statement-breakpoint
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_inviter_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "inviter_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "inviter_email" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "suspended_until" timestamp;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "suspended_by" text;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_suspended_by_user_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_status_idx" ON "invitation" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "member_suspended_idx" ON "member" USING btree ("organization_id","suspended_at");