import { Image, Text, View } from "@react-pdf/renderer";
import { s } from "./styles";

export type PdfBusiness = {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  /** Logo bytes from Settings; react-pdf supports PNG and JPEG. */
  logo: { data: Buffer; format: "png" | "jpg" } | null;
};

/**
 * Top-left business details shared by invoices and receipts. With a logo, the
 * logo replaces the bold business name (logos usually include the name).
 */
export function BusinessBlock({ business }: { business: PdfBusiness }) {
  return (
    <View style={{ maxWidth: 260 }}>
      {business.logo ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
        <Image
          src={business.logo}
          style={{ height: 64, objectFit: "contain", objectPosition: "left", marginBottom: 8 }}
        />
      ) : (
        <Text style={s.bizName}>{business.name}</Text>
      )}
      {business.address && <Text style={s.muted}>{business.address}</Text>}
      {business.email && <Text style={s.muted}>{business.email}</Text>}
      {business.phone && <Text style={s.muted}>{business.phone}</Text>}
      {business.taxId && <Text style={s.muted}>Tax ID: {business.taxId}</Text>}
    </View>
  );
}
