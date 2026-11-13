-- Switch from self-hosted Better Auth tables to Neon Auth (neon_auth schema).
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_created_by_user_id_fk";--> statement-breakpoint
ALTER TABLE "invites" DROP CONSTRAINT IF EXISTS "invites_invited_by_user_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_created_by_user_id_fk";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_recorded_by_user_id_fk";--> statement-breakpoint
DROP TABLE "public"."account" CASCADE;--> statement-breakpoint
DROP TABLE "public"."session" CASCADE;--> statement-breakpoint
DROP TABLE "public"."verification" CASCADE;--> statement-breakpoint
DROP TABLE "public"."user" CASCADE;
