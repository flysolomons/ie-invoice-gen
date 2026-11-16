import { Document, Page, Text, View } from "@react-pdf/renderer";
import { STATUS_LABELS } from "@/lib/invoice-status";
import { bpToPercent, formatMoney } from "@/lib/money";
import type { PdfBusiness } from "./business-block";
import { DocFooter, DocHeader, Field, type PillTone, Watermark } from "./parts";
import { C, s } from "./styles";

/** Plain view-model: everything the PDF needs, nothing from the DB layer. */
export type InvoicePdfData = {
  number: string | null;
  status: "draft" | "sent" | "partially_paid" | "paid" | "void" | "overdue";
  currency: string;
  issueDate: string;
  dueDate: string;
  business: PdfBusiness;
  client: { name: string; email: string | null; address: string | null; taxId: string | null };
  items: {
    description: string;
    quantity: string;
    unitPriceCents: number;
    taxRateBp: number;
    lineSubtotalCents: number;
  }[];
  subtotalCents: number;
  discountCents: number;
  discountLabel: string | null;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  notes: string | null;
  terms: string | null;
  footer: string | null;
};

const TONE: Record<InvoicePdfData["status"], PillTone> = {
  draft: "gray",
  sent: "navy",
  partially_paid: "gold",
  overdue: "red",
  paid: "green",
  void: "gray",
};

const STAMP: Partial<Record<InvoicePdfData["status"], { text: string; color: string }>> = {
  draft: { text: "DRAFT", color: C.muted },
  void: { text: "VOID", color: C.red },
  paid: { text: "PAID", color: C.green },
};

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const fmt = (c: number) => formatMoney(c, data.currency);
  const balance = data.totalCents - data.paidCents;
  const stamp = STAMP[data.status];
  const title = data.number ? `Invoice ${data.number}` : "Draft invoice";
  const isVoid = data.status === "void";

  return (
    <Document title={title} author={data.business.name} creator={data.business.name}>
      <Page size="A4" style={s.page}>
        {stamp && <Watermark text={stamp.text} color={stamp.color} />}

        <DocHeader
          business={data.business}
          title="Invoice"
          number={data.number ?? "Draft"}
          status={{ label: STATUS_LABELS[data.status], tone: TONE[data.status] }}
        />

        {/* Who, when, how much */}
        <View style={[s.row, { marginTop: 26, gap: 10 }]}>
          <View style={[s.card, { flex: 1.4 }]}>
            <Text style={s.label}>Billed to</Text>
            <Text style={[s.bold, { fontSize: 10.5 }]}>{data.client.name}</Text>
            {data.client.address && <Text>{data.client.address}</Text>}
            {data.client.email && <Text style={s.muted}>{data.client.email}</Text>}
            {data.client.taxId && <Text style={s.muted}>Tax ID: {data.client.taxId}</Text>}
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Field label="Issue date" value={data.issueDate} />
            <Field label="Due date" value={data.dueDate} />
            <Field label="Currency" value={data.currency} last />
          </View>
          <View style={[s.heroCard, { flex: 1.1, justifyContent: "space-between" }]}>
            <View>
              <Text style={s.heroLabel}>{isVoid ? "Status" : "Amount due"}</Text>
              <Text style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15 }}>
                {isVoid ? "Void" : fmt(balance)}
              </Text>
            </View>
            {!isVoid && (
              <Text style={{ color: "#c9d1ee", fontSize: 8, marginTop: 10 }}>
                {balance === 0 ? "Paid in full — thank you" : `Due by ${data.dueDate}`}
              </Text>
            )}
          </View>
        </View>

        {/* Line items */}
        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={s.cDesc}>Description</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cPrice}>Unit price</Text>
            <Text style={s.cTax}>Tax</Text>
            <Text style={s.cAmt}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={s.cDesc}>{item.description}</Text>
              <Text style={[s.cQty, s.muted]}>{item.quantity}</Text>
              <Text style={[s.cPrice, s.muted]}>{fmt(item.unitPriceCents)}</Text>
              <Text style={[s.cTax, s.muted]}>{bpToPercent(item.taxRateBp)}%</Text>
              <Text style={[s.cAmt, s.bold]}>{fmt(item.lineSubtotalCents)}</Text>
            </View>
          ))}
        </View>

        {/* Notes & terms beside the totals */}
        <View style={[s.row, { marginTop: 18, gap: 24 }]} wrap={false}>
          <View style={{ flex: 1 }}>
            {data.notes && (
              <View style={{ marginBottom: 12 }}>
                <Text style={s.label}>Notes</Text>
                <Text>{data.notes}</Text>
              </View>
            )}
            {data.terms && (
              <View>
                <Text style={s.label}>Terms</Text>
                <Text style={s.muted}>{data.terms}</Text>
              </View>
            )}
          </View>
          <View style={s.totals}>
            <View style={s.totalLine}>
              <Text style={s.muted}>Subtotal</Text>
              <Text>{fmt(data.subtotalCents)}</Text>
            </View>
            {data.discountCents > 0 && (
              <View style={s.totalLine}>
                <Text style={s.muted}>{data.discountLabel ?? "Discount"}</Text>
                <Text>−{fmt(data.discountCents)}</Text>
              </View>
            )}
            <View style={s.totalLine}>
              <Text style={s.muted}>Tax</Text>
              <Text>{fmt(data.taxCents)}</Text>
            </View>
            <View style={s.grand}>
              <Text>Total</Text>
              <Text>{fmt(data.totalCents)}</Text>
            </View>
            {data.paidCents > 0 && (
              <>
                <View style={[s.totalLine, { marginTop: 4 }]}>
                  <Text style={s.muted}>Paid</Text>
                  <Text>−{fmt(data.paidCents)}</Text>
                </View>
                <View style={[s.totalLine, s.bold]}>
                  <Text>Balance due</Text>
                  <Text>{fmt(balance)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <DocFooter
          business={data.business}
          right={data.footer ?? (data.number ? `Invoice ${data.number}` : "Draft invoice")}
        />
      </Page>
    </Document>
  );
}
