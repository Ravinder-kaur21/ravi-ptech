-- Migration: Add id column to organization_role table
-- Better Auth requires an id primary key on the organizationRole table
-- Created by: manual (following SCHEMA_MISMATCH error)
-- Version: better-auth@1.7.7

ALTER TABLE "organization_role"
  ADD COLUMN "id" text NOT NULL DEFAULT gen_random_uuid()::text;

ALTER TABLE "organization_role"
  DROP CONSTRAINT IF EXISTS "organization_role_pkey";

ALTER TABLE "organization_role"
  ADD CONSTRAINT "organization_role_pkey" PRIMARY KEY ("id");
