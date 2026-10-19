-- 0015_copilot_setting_extra.sql
--
-- Adds `default_model`, `default_provider`, and `web_search_default` columns to
-- `copilot_setting` so the Settings page can persist the user's choices.
--
-- All 6 copilot_* tables are also defined here idempotently (CREATE TABLE IF NOT
-- EXISTS / CREATE INDEX IF NOT EXISTS) because Drizzle's snapshot was unaware of
-- them — they were previously created at runtime by `lib/copilot/db-init.ts`. To
-- keep the table list real, we let Drizzle own their declaration too. The runtime
-- DDL stays in place as a defensive fallback for installs that haven't yet run
-- this migration; in the wild they'll no-op on the second pass.

CREATE TABLE IF NOT EXISTS "copilot_chat" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'New Conversation' NOT NULL,
	"specialist" varchar(50) DEFAULT 'main' NOT NULL,
	"model" varchar(150),
	"provider" varchar(50),
	"pinned" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "copilot_log" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text,
	"chat_id" text,
	"level" varchar(30) DEFAULT 'info' NOT NULL,
	"action" varchar(150) NOT NULL,
	"tool_name" varchar(100),
	"specialist" varchar(50) DEFAULT 'main',
	"status" varchar(50) DEFAULT 'completed' NOT NULL,
	"duration_ms" varchar(30),
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "copilot_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"key" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(50) DEFAULT 'fact' NOT NULL,
	"source" varchar(50) DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "copilot_message" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(30) NOT NULL,
	"parts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "copilot_scheduled_task" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text,
	"title" varchar(255) NOT NULL,
	"description" text,
	"task_type" varchar(50) DEFAULT 'driver_task' NOT NULL,
	"specialist" varchar(50) DEFAULT 'dispatcher' NOT NULL,
	"target_driver_id" text,
	"target_driver_name" varchar(255),
	"target_driver_phone" varchar(50),
	"target_load_id" text,
	"target_load_number" varchar(100),
	"schedule_type" varchar(30) DEFAULT 'once' NOT NULL,
	"interval_minutes" varchar(20),
	"run_at" timestamp,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"priority" varchar(30) DEFAULT 'normal' NOT NULL,
	"driver_prompt" text,
	"driver_response" text,
	"conversation_log" jsonb DEFAULT '[]'::jsonb,
	"last_result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "copilot_setting" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"coat" varchar(50) DEFAULT 'ink' NOT NULL,
	"custom_palette" jsonb,
	"auto_cycle_coat" boolean DEFAULT false NOT NULL,
	"default_specialist" varchar(50) DEFAULT 'main' NOT NULL,
	"allow_all" boolean DEFAULT false NOT NULL,
	"approval_threshold" varchar(50) DEFAULT '0',
	"memory_enabled" boolean DEFAULT true NOT NULL,
	"custom_instructions" text,
	"proactive_heartbeat" boolean DEFAULT true NOT NULL,
	"sound_enabled" boolean DEFAULT true NOT NULL,
	"show_chain_of_thought" boolean DEFAULT true NOT NULL,
	"max_steps" varchar(10) DEFAULT '12' NOT NULL,
	"default_model" varchar(150) DEFAULT 'gemini-2.5-flash',
	"default_provider" varchar(50) DEFAULT 'openrouter',
	"web_search_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_chat" ADD CONSTRAINT "copilot_chat_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_chat" ADD CONSTRAINT "copilot_chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_log" ADD CONSTRAINT "copilot_log_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_log" ADD CONSTRAINT "copilot_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_memory" ADD CONSTRAINT "copilot_memory_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_memory" ADD CONSTRAINT "copilot_memory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_message" ADD CONSTRAINT "copilot_message_chat_id_copilot_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."copilot_chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_message" ADD CONSTRAINT "copilot_message_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_message" ADD CONSTRAINT "copilot_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_scheduled_task" ADD CONSTRAINT "copilot_scheduled_task_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_scheduled_task" ADD CONSTRAINT "copilot_scheduled_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_setting" ADD CONSTRAINT "copilot_setting_tenant_id_organization_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "copilot_setting" ADD CONSTRAINT "copilot_setting_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_chat_tenant_user_idx" ON "copilot_chat" USING btree ("tenant_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_log_tenant_created_idx" ON "copilot_log" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_log_chat_idx" ON "copilot_log" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_memory_tenant_user_idx" ON "copilot_memory" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_message_chat_idx" ON "copilot_message" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_task_tenant_status_idx" ON "copilot_scheduled_task" USING btree ("tenant_id","status","next_run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_setting_tenant_user_idx" ON "copilot_setting" USING btree ("tenant_id","user_id");
