import { Text, View } from "@react-pdf/renderer";
import { BusinessBlock, type PdfBusiness } from "./business-block";
import { C, s } from "./styles";

export type PillTone = "navy" | "green" | "gold" | "red" | "gray";

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  navy: { bg: "#dfe5f7", fg: C.navy },
  green: { bg: "#dcefe1", fg: C.green },
  gold: { bg: "#fdefcf", fg: "#6b4a00" },
  red: { bg: "#fbdcde", fg: "#9b0712" },
  gray: { bg: "#e9ebef", fg: C.muted },
};

export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  const t = TONES[tone];
  return (
    <View
      style={{
        alignSelf: "flex-end",
        marginTop: 8,
        backgroundColor: t.bg,
        borderRadius: 10,
        paddingVertical: 3,
        paddingHorizontal: 9,
      }}
    >
      <Text style={{ color: t.fg, fontSize: 7.5, fontWeight: 700, letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

/** Brand band, business details on the left, document title + number + status on the right. */
export function DocHeader({
  business,
  title,
  number,
  status,
}: {
  business: PdfBusiness;
  title: string;
  number: string;
  status: { label: string; tone: PillTone } | null;
}) {
  return (
    <>
      <View style={s.topBand} fixed />
      <View style={s.topAccent} fixed />
      <View style={s.between}>
        <BusinessBlock business={business} />
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.docTitle}>{title}</Text>
          <Text style={s.docNumber}>
            <Text style={s.muted}>No. </Text>
            <Text style={s.bold}>{number}</Text>
          </Text>
          {status && <StatusPill label={status.label} tone={status.tone} />}
        </View>
      </View>
    </>
  );
}

/** Label + value pair used inside info cards. */
export function Field({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={{ marginBottom: last ? 0 : 8 }}>
      <Text style={s.label}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

export function Watermark({ text, color }: { text: string; color: string }) {
  return (
    <Text style={[s.stamp, { color }]} fixed>
      {text}
    </Text>
  );
}

/**
 * Contact line + document number on every page. No "page x of y": in this
 * react-pdf version a `render` Text never paints (and hides its fixed parent).
 */
export function DocFooter({ business, right }: { business: PdfBusiness; right: string }) {
  const contact = [business.name, business.email, business.phone].filter(Boolean).join("  ·  ");
  return (
    <View style={s.footer} fixed>
      <Text>{contact}</Text>
      <Text>{right}</Text>
    </View>
  );
}
