import { StyleSheet } from "@react-pdf/renderer";
import { PDF_FONT_FAMILY } from "./fonts";

/** Brand palette (hex equivalents of the app's theme tokens in globals.css). */
export const C = {
  navy: "#17286c",
  gold: "#f9b227",
  green: "#256b35",
  red: "#d40c1a",
  ink: "#10172b",
  muted: "#555e6f",
  border: "#dee1e8",
  tint: "#eff4fc",
  white: "#ffffff",
};

/** Kept for callers that only need the two neutrals. */
export const MUTED = C.muted;
export const BORDER = C.border;

const PAD_X = 44;

export const s = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9.5,
    color: C.ink,
    paddingTop: 44,
    paddingBottom: 64,
    paddingHorizontal: PAD_X,
    lineHeight: 1.45,
  },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  muted: { color: C.muted },
  bold: { fontWeight: 700 },

  docTitle: { fontSize: 26, fontWeight: 700, color: C.navy, lineHeight: 1.1, letterSpacing: -0.3 },
  docNumber: { fontSize: 10.5, marginTop: 4, color: C.ink },
  bizName: { fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 3 },

  label: {
    color: C.muted,
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  /** Light tinted info panel. */
  card: { backgroundColor: C.tint, borderRadius: 8, padding: 12 },
  /** Navy highlight panel (amount due / amount received). */
  heroCard: { backgroundColor: C.navy, borderRadius: 8, padding: 12, color: C.white },
  heroLabel: {
    color: "#c9d1ee",
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  /* Line items */
  table: { marginTop: 22 },
  th: {
    flexDirection: "row",
    backgroundColor: C.tint,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    color: C.navy,
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 44, textAlign: "right" },
  cPrice: { width: 80, textAlign: "right" },
  cTax: { width: 44, textAlign: "right" },
  cAmt: { width: 84, textAlign: "right" },

  /* Totals */
  totals: { width: 230 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 10 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: C.navy,
    color: C.white,
    borderRadius: 6,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 11.5,
    fontWeight: 700,
  },

  footer: {
    position: "absolute",
    bottom: 28,
    left: PAD_X,
    right: PAD_X,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    color: C.muted,
    fontSize: 7.5,
  },

  /** Faint diagonal watermark (DRAFT / VOID / PAID / REVERSED). */
  stamp: {
    position: "absolute",
    top: 330,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 96,
    fontWeight: 700,
    letterSpacing: 6,
    opacity: 0.07,
    transform: "rotate(-30deg)",
  },
});
