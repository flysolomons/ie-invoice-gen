CREATE TYPE "public"."document_kind" AS ENUM('invoice', 'receipt');--> statement-breakpoint
CREATE TABLE "number_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "document_kind" NOT NULL,
	"doc_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"old_number" text NOT NULL,
	"new_number" text NOT NULL,
	"reason" text,
	"changed_by" text NOT NULL,
	"changed_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "number_amendments" ADD CONSTRAINT "number_amendments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "number_amendments_old_idx" ON "number_amendments" USING btree ("kind",lower("old_number"));--> statement-breakpoint
CREATE INDEX "number_amendments_invoice_idx" ON "number_amendments" USING btree ("invoice_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_lower_uidx" ON "invoices" USING btree (lower("number"));--> statement-breakpoint
CREATE UNIQUE INDEX "payments_receipt_number_lower_uidx" ON "payments" USING btree (lower("receipt_number"));