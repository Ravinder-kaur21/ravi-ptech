CREATE TABLE "feature_flag" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'boolean' NOT NULL,
	"default_value" text DEFAULT 'false' NOT NULL,
	"rollout_percent" text DEFAULT '0' NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_feature_flag" (
	"feature_flag_key" text NOT NULL,
	"organization_id" text NOT NULL,
	"value" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_feature_flag" (
	"feature_flag_key" text NOT NULL,
	"user_id" text NOT NULL,
	"value" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_flag" ADD CONSTRAINT "feature_flag_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_feature_flag" ADD CONSTRAINT "org_feature_flag_feature_flag_key_feature_flag_key_fk" FOREIGN KEY ("feature_flag_key") REFERENCES "public"."feature_flag"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_feature_flag" ADD CONSTRAINT "org_feature_flag_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_feature_flag" ADD CONSTRAINT "org_feature_flag_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_flag" ADD CONSTRAINT "user_feature_flag_feature_flag_key_feature_flag_key_fk" FOREIGN KEY ("feature_flag_key") REFERENCES "public"."feature_flag"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_flag" ADD CONSTRAINT "user_feature_flag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_flag" ADD CONSTRAINT "user_feature_flag_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_feature_flag_org_idx" ON "org_feature_flag" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_feature_flag_key_idx" ON "org_feature_flag" USING btree ("feature_flag_key");--> statement-breakpoint
CREATE INDEX "user_feature_flag_user_idx" ON "user_feature_flag" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_feature_flag_key_idx" ON "user_feature_flag" USING btree ("feature_flag_key");