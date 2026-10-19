-- Migration: Add organization_role table for Dynamic Access Control
-- Better Auth: enables per-workspace custom roles (WS-31/32/33)
-- Created by: better-auth migration
-- Version: better-auth@1.7.7

CREATE TABLE IF NOT EXISTS "organization_role" (
  "organization_id" text NOT NULL,
  "role" text NOT NULL,
  "permission" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  CONSTRAINT organization_role_organization_id_fkey
    FOREIGN KEY ("organization_id")
    REFERENCES "organization"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_role_organization_id_idx"
  ON "organization_role"("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_role_role_idx"
  ON "organization_role"("role");
