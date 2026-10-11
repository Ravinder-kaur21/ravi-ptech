ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actor_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "driver" DROP CONSTRAINT "driver_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "email_broadcast" DROP CONSTRAINT "email_broadcast_sent_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "pay_item" DROP CONSTRAINT "pay_item_pay_stub_id_pay_stub_id_fk";
--> statement-breakpoint
ALTER TABLE "pay_stub" DROP CONSTRAINT "pay_stub_driver_id_driver_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "email_broadcast" ALTER COLUMN "sent_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "suspended_by" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver" ADD CONSTRAINT "driver_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_broadcast" ADD CONSTRAINT "email_broadcast_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_suspended_by_user_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_item" ADD CONSTRAINT "pay_item_pay_stub_id_pay_stub_id_fk" FOREIGN KEY ("pay_stub_id") REFERENCES "public"."pay_stub"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_stub" ADD CONSTRAINT "pay_stub_driver_id_driver_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."driver"("id") ON DELETE set null ON UPDATE no action;