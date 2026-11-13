ALTER TABLE "business_settings" ADD COLUMN "logo_data" "bytea";--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "logo_mime" text;--> statement-breakpoint
-- Old logos were files on one machine; clear the pointer so no environment shows a broken image. Re-upload once.
UPDATE "business_settings" SET "logo_key" = NULL;
