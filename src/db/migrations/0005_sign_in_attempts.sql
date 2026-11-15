CREATE TYPE "public"."sign_in_method" AS ENUM('password', 'microsoft');--> statement-breakpoint
CREATE TYPE "public"."sign_in_outcome" AS ENUM('success', 'blocked', 'failed');--> statement-breakpoint
CREATE TABLE "sign_in_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method" "sign_in_method" NOT NULL,
	"outcome" "sign_in_outcome" NOT NULL,
	"email" text,
	"auth_user_id" text,
	"reason" text,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_in_attempts_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE INDEX "sign_in_attempts_created_idx" ON "sign_in_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sign_in_attempts_email_idx" ON "sign_in_attempts" USING btree ("email");