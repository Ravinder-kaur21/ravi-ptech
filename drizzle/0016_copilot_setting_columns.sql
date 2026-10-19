-- 0016_copilot_setting_columns.sql
--
-- Adds the three Settings-page columns to `copilot_setting` for installs
-- where 0015 was already applied but its `CREATE TABLE IF NOT EXISTS`
-- ran against an existing legacy table (no new columns). Re-running 0015 is
-- a no-op for these columns; this migration back-fills them with safe
-- `IF NOT EXISTS` clauses.
--
-- Idempotent against any environment — fresh DBs (0015 added the columns)
-- skip the ALTER, legacy DBs (without these columns) get them now.

ALTER TABLE "copilot_setting" ADD COLUMN IF NOT EXISTS "default_model" varchar(150) DEFAULT 'gemini-2.5-flash';
--> statement-breakpoint
ALTER TABLE "copilot_setting" ADD COLUMN IF NOT EXISTS "default_provider" varchar(50) DEFAULT 'openrouter';
--> statement-breakpoint
ALTER TABLE "copilot_setting" ADD COLUMN IF NOT EXISTS "web_search_default" boolean DEFAULT false NOT NULL;
