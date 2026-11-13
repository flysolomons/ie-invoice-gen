import { Document, Page, Text, View } from "@react-pdf/renderer";
import { bpToPercent, formatMoney } from "@/lib/money";
import { BusinessBlock, type PdfBusiness } from "./business-block";
import { s } from "./styles";

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

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  const fmt = (c: number) => formatMoney(c, data.currency);
  const balance = data.totalCents - data.paidCents;
  const stamp =
    data.status === "draft" ? "DRAFT" : data.status === "void" ? "VOID" : data.status === "paid" ? "PAID" : null;
  const title = data.number ? `Invoice ${data.number}` : "Draft invoice";

  return (
    <Document title={title} author={data.business.name} creator={data.business.name}>
      <Page size="A4" style={s.page}>
        {stamp && (
          <Text style={s.stamp} fixed>
            {stamp}
          </Text>
        )}

        {/* Header */}
        <View style={s.between}>
          <BusinessBlock business={data.business} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.h1}>INVOICE</Text>
            <Text style={{ fontSize: 11, marginTop: 6, lineHeight: 1.2 }}>{data.number ?? "DRAFT"}</Text>
          </View>
        </View>

        {/* Parties & dates */}
        <View style={[s.row, s.section]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={s.label}>Bill to</Text>
            <Text style={{ fontWeight: 700 }}>{data.client.name}</Text>
            {data.client.address && <Text>{data.client.address}</Text>}
            {data.client.email && <Text style={s.muted}>{data.client.email}</Text>}
            {data.client.taxId && <Text style={s.muted}>Tax ID: {data.client.taxId}</Text>}
          </View>
          <View style={{ width: 150 }}>
            <Text style={s.label}>Issue date</Text>
            <Text>{data.issueDate}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>Due date</Text>
            <Text>{data.dueDate}</Text>
          </View>
          <View style={{ width: 120, alignItems: "flex-end" }}>
            <Text style={s.label}>{data.status === "void" ? "Status" : "Amount due"}</Text>
            <Text style={{ fontSize: 14, fontWeight: 700 }}>
              {data.status === "void" ? "Void" : fmt(balance)}
            </Text>
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
              <Text style={s.cQty}>{item.quantity}</Text>
              <Text style={s.cPrice}>{fmt(item.unitPriceCents)}</Text>
              <Text style={s.cTax}>{bpToPercent(item.taxRateBp)}%</Text>
              <Text style={s.cAmt}>{fmt(item.lineSubtotalCents)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totals} wrap={false}>
          <View style={s.totalLine}>
            <Text>Subtotal</Text>
            <Text>{fmt(data.subtotalCents)}</Text>
          </View>
          {data.discountCents > 0 && (
            <View style={s.totalLine}>
              <Text>{data.discountLabel ?? "Discount"}</Text>
              <Text>−{fmt(data.discountCents)}</Text>
            </View>
          )}
          <View style={s.totalLine}>
            <Text>Tax</Text>
            <Text>{fmt(data.taxCents)}</Text>
          </View>
          <View style={s.grand}>
            <Text>Total</Text>
            <Text>{fmt(data.totalCents)}</Text>
          </View>
          {data.paidCents > 0 && (
            <>
              <View style={s.totalLine}>
                <Text>Paid</Text>
                <Text>−{fmt(data.paidCents)}</Text>
              </View>
              <View style={[s.totalLine, { fontWeight: 700 }]}>
                <Text>Balance due</Text>
                <Text>{fmt(balance)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Notes & terms */}
        {data.notes && (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        )}
        {data.terms && (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>Terms</Text>
            <Text>{data.terms}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>{data.footer ?? data.business.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
