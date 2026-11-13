import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/money";
import { BusinessBlock, type PdfBusiness } from "./business-block";
import { BORDER, s } from "./styles";

export type ReceiptPdfData = {
  receiptNumber: string;
  paidAt: string;
  amountCents: number;
  currency: string;
  method: string;
  reference: string | null;
  reversed: boolean;
  business: PdfBusiness;
  client: { name: string; email: string | null; address: string | null };
  invoice: { number: string | null; issueDate: string; totalCents: number };
  /** Non-reversed payments on the invoice up to and including this one. */
  paidToDateCents: number;
};

export function ReceiptPdf({ data }: { data: ReceiptPdfData }) {
  const fmt = (c: number) => formatMoney(c, data.currency);
  const balanceAfter = Math.max(data.invoice.totalCents - data.paidToDateCents, 0);

  const rows: [string, string][] = [
    ["Payment date", data.paidAt],
    ["Payment method", data.method],
    ...(data.reference ? ([["Reference", data.reference]] as [string, string][]) : []),
    ["For invoice", `${data.invoice.number ?? "—"} (issued ${data.invoice.issueDate})`],
    ["Invoice total", fmt(data.invoice.totalCents)],
    // A reversed payment no longer counts, so a running total here would mislead.
    ...(data.reversed
      ? []
      : ([
          ["Paid to date", fmt(data.paidToDateCents)],
          ["Balance remaining", fmt(balanceAfter)],
        ] as [string, string][])),
  ];

  return (
    <Document
      title={`Receipt ${data.receiptNumber}`}
      author={data.business.name}
      creator={data.business.name}
    >
      <Page size="A4" style={s.page}>
        {data.reversed && (
          <Text style={s.stamp} fixed>
            REVERSED
          </Text>
        )}

        <View style={s.between}>
          <BusinessBlock business={data.business} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.h1}>RECEIPT</Text>
            <Text style={{ fontSize: 11, marginTop: 6, lineHeight: 1.2 }}>{data.receiptNumber}</Text>
          </View>
        </View>

        <View style={[s.row, s.section]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={s.label}>Received from</Text>
            <Text style={{ fontWeight: 700 }}>{data.client.name}</Text>
            {data.client.address && <Text>{data.client.address}</Text>}
            {data.client.email && <Text style={s.muted}>{data.client.email}</Text>}
          </View>
          <View style={{ width: 160, alignItems: "flex-end" }}>
            <Text style={s.label}>Amount received</Text>
            <Text style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
              {fmt(data.amountCents)}
            </Text>
          </View>
        </View>

        <View style={[s.table, { width: 320 }]}>
          {rows.map(([label, value]) => (
            <View key={label} style={[s.tr, { borderColor: BORDER }]}>
              <Text style={[s.muted, { width: 130 }]}>{label}</Text>
              <Text style={{ flex: 1 }}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text>
            {data.reversed
              ? "This payment has been reversed and this receipt is no longer valid."
              : balanceAfter === 0
                ? "Thank you — this invoice is now paid in full."
                : "Thank you for your payment."}
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text>{data.business.name}</Text>
          <Text>{data.receiptNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
