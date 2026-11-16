import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/money";
import type { PdfBusiness } from "./business-block";
import { DocFooter, DocHeader, Field, Watermark } from "./parts";
import { C, s } from "./styles";

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
  const paidInFull = !data.reversed && balanceAfter === 0;

  // A reversed payment no longer counts, so running totals would mislead.
  const summary: [string, string][] = [
    ["Invoice total", fmt(data.invoice.totalCents)],
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
        {data.reversed && <Watermark text="REVERSED" color={C.red} />}

        <DocHeader
          business={data.business}
          title="Receipt"
          number={data.receiptNumber}
          status={
            data.reversed
              ? { label: "Reversed", tone: "red" }
              : { label: paidInFull ? "Paid in full" : "Payment received", tone: "green" }
          }
        />

        {/* Amount */}
        <View style={[s.heroCard, s.between, { marginTop: 26, padding: 18, alignItems: "flex-end" }]}>
          <View>
            <Text style={s.heroLabel}>Amount received</Text>
            <Text style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{fmt(data.amountCents)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: "#c9d1ee", fontSize: 8.5 }}>Paid on {data.paidAt}</Text>
            <Text style={{ color: "#c9d1ee", fontSize: 8.5 }}>via {data.method}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={[s.row, { marginTop: 12, gap: 10 }]}>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.label}>Received from</Text>
            <Text style={[s.bold, { fontSize: 10.5 }]}>{data.client.name}</Text>
            {data.client.address && <Text>{data.client.address}</Text>}
            {data.client.email && <Text style={s.muted}>{data.client.email}</Text>}
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Field label="For invoice" value={data.invoice.number ?? "—"} />
            <Field label="Invoice date" value={data.invoice.issueDate} last={!data.reference} />
            {data.reference && <Field label="Payment reference" value={data.reference} last />}
          </View>
        </View>

        {/* Balance summary */}
        <View style={{ marginTop: 22, marginLeft: "auto", width: 260 }}>
          {summary.map(([label, value], i) => {
            const last = i === summary.length - 1;
            return (
              <View
                key={label}
                style={[
                  s.totalLine,
                  { paddingVertical: 6, borderBottomWidth: last ? 0 : 1, borderColor: C.border },
                  last ? s.bold : {},
                ]}
              >
                <Text style={last ? {} : s.muted}>{label}</Text>
                <Text>{value}</Text>
              </View>
            );
          })}
        </View>

        <View
          style={{
            marginTop: 26,
            padding: 12,
            borderRadius: 8,
            borderLeftWidth: 3,
            borderColor: data.reversed ? C.red : C.green,
            backgroundColor: data.reversed ? "#fdecee" : "#e9f5ec",
          }}
        >
          <Text style={{ color: data.reversed ? "#9b0712" : C.green, fontWeight: 700 }}>
            {data.reversed
              ? "This payment has been reversed and this receipt is no longer valid."
              : paidInFull
                ? "Thank you — this invoice is now paid in full."
                : "Thank you for your payment."}
          </Text>
        </View>

        <DocFooter business={data.business} right={`Receipt ${data.receiptNumber}`} />
      </Page>
    </Document>
  );
}
