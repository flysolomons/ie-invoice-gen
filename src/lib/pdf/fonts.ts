import path from "node:path";
import { Font } from "@react-pdf/renderer";

/**
 * Inter, split into the "latin" subset (€ £ ¥ $ and Western European text) and
 * "latin-ext" (₹ ₦ ₱ … and Central/Eastern European letters). react-pdf falls
 * back from the first family to the second per glyph.
 * Files ship with @fontsource/inter; next.config traces them into the
 * serverless bundle via outputFileTracingIncludes.
 */
const dir = path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files");
const file = (subset: string, weight: number) =>
  path.join(dir, `inter-${subset}-${weight}-normal.woff`);

let registered = false;

export const PDF_FONT_FAMILY = ["Inter", "InterExt"];

export function registerPdfFonts() {
  if (registered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: file("latin", 400) },
      { src: file("latin", 700), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "InterExt",
    fonts: [
      { src: file("latin-ext", 400) },
      { src: file("latin-ext", 700), fontWeight: 700 },
    ],
  });
  // Don't split words with hyphens.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
