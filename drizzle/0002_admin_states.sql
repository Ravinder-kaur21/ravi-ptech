-- Migration 0002: Admin states (suspend + appeal workflow)
-- Adds suspension columns to user. Ban columns already exist from 0000.

ALTER TABLE "user" ADD COLUMN "suspended_at" timestamp;
ALTER TABLE "user" ADD COLUMN "suspended_until" timestamp;
ALTER TABLE "user" ADD COLUMN "suspended_reason" text;
ALTER TABLE "user" ADD COLUMN "suspended_by" text REFERENCES "user"("id") ON DELETE SET NULL;
ALTER TABLE "user" ADD COLUMN "appeal_message" text;
ALTER TABLE "user" ADD COLUMN "appeal_submitted_at" timestamp;
ALTER TABLE "user" ADD COLUMN "appeal_status" text;
ALTER TABLE "user" ADD COLUMN "appeal_resolved_by" text REFERENCES "user"("id") ON DELETE SET NULL;