import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ */
/* Team membership                                                     */
/* ------------------------------------------------------------------ */

/**
 * Accounts live in Neon Auth (neon_auth schema, managed by Neon).
 * This table decides who may use the app and with which role: a Neon Auth
 * user without a row here gets no access. Linked by the Neon Auth user id.
 */
export const userRole = pgEnum("user_role", ["owner", "member"]);

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: text("auth_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("member"),
  /** Set when an owner removes someone; blocks access and automatic re-joining. */
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  ...timestamps,
});

/** Owner-issued invite links. Only the SHA-256 hash of the token is stored. */
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  role: userRole("role").notNull().default("member"),
  tokenHash: text("token_hash").notNull().unique(),
  invitedBy: text("invited_by"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* Business settings (single row, id = 1)                              */
/* ------------------------------------------------------------------ */

export const businessSettings = pgTable(
  "business_settings",
  {
    id: integer("id").primaryKey().default(1),
    name: text("name").notNull().default("My Business"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    taxId: text("tax_id"),
    logoKey: text("logo_key"),
    defaultCurrency: text("default_currency").notNull().default("USD"),
    /** Basis points: 1500 = 15.00% */
    defaultTaxRateBp: integer("default_tax_rate_bp").notNull().default(0),
    defaultPaymentTermsDays: integer("default_payment_terms_days").notNull().default(14),
    timezone: text("timezone").notNull().default("UTC"),
    invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
    nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
    receiptPrefix: text("receipt_prefix").notNull().default("RCT-"),
    nextReceiptNumber: integer("next_receipt_number").notNull().default(1),
    emailFromName: text("email_from_name"),
    footerNotes: text("footer_notes"),
    ...timestamps,
  },
  (t) => [check("business_settings_singleton", sql`${t.id} = 1`)],
);

/* ------------------------------------------------------------------ */
/* Clients & invoices                                                  */
/* ------------------------------------------------------------------ */

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxId: text("tax_id"),
  currency: text("currency"),
  notes: text("notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
});

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "void",
]);
export const discountType = pgEnum("discount_type", ["none", "percent", "fixed"]);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Assigned when the invoice is issued, never for drafts. */
    number: text("number").unique(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    status: invoiceStatus("status").notNull().default("draft"),
    currency: text("currency").notNull(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountType: discountType("discount_type").notNull().default("none"),
    /** Basis points for percent, cents for fixed. */
    discountValue: integer("discount_value").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    notes: text("notes"),
    terms: text("terms"),
    publicToken: text("public_token").unique(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdBy: text("created_by"),
    ...timestamps,
  },
  (t) => [
    index("invoices_status_idx").on(t.status),
    index("invoices_client_idx").on(t.clientId),
    index("invoices_due_idx").on(t.dueDate),
    check("invoices_total_nonneg", sql`${t.totalCents} >= 0`),
    check("invoices_paid_le_total", sql`${t.paidCents} <= ${t.totalCents}`),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    lineSubtotalCents: integer("line_subtotal_cents").notNull(),
    lineTaxCents: integer("line_tax_cents").notNull(),
  },
  (t) => [index("invoice_items_invoice_idx").on(t.invoiceId)],
);

/* ------------------------------------------------------------------ */
/* Payments (client receipts)                                          */
/* ------------------------------------------------------------------ */

export const paymentMethod = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "card",
  "cheque",
  "other",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    paidAt: date("paid_at").notNull(),
    method: paymentMethod("method").notNull(),
    reference: text("reference"),
    receiptNumber: text("receipt_number").notNull().unique(),
    receiptSentAt: timestamp("receipt_sent_at", { withTimezone: true }),
    recordedBy: text("recorded_by"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    ...timestamps,
  },
  (t) => [
    index("payments_invoice_idx").on(t.invoiceId),
    index("payments_paid_at_idx").on(t.paidAt),
    check("payments_amount_positive", sql`${t.amountCents} > 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* Expenses (uploaded expense receipts)                                */
/* ------------------------------------------------------------------ */

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  ...timestamps,
});

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendor: text("vendor").notNull(),
    categoryId: uuid("category_id").references(() => expenseCategories.id, {
      onDelete: "set null",
    }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    expenseDate: date("expense_date").notNull(),
    notes: text("notes"),
    fileKey: text("file_key"),
    fileName: text("file_name"),
    fileMime: text("file_mime"),
    fileSize: integer("file_size"),
    createdBy: text("created_by"),
    ...timestamps,
  },
  (t) => [
    index("expenses_date_idx").on(t.expenseDate),
    check("expenses_amount_positive", sql`${t.amountCents} > 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* Email log                                                           */
/* ------------------------------------------------------------------ */

export const emailKind = pgEnum("email_kind", ["invoice", "receipt", "invite"]);
export const emailStatus = pgEnum("email_status", ["sent", "failed"]);

export const emailLog = pgTable("email_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: emailKind("kind").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
  status: emailStatus("status").notNull(),
  error: text("error"),
  providerMessageId: text("provider_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const clientsRelations = relations(clients, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
}));
