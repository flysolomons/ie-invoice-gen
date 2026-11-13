import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page sits behind login and reads the session, so we render
  // dynamically per request instead of using Cache Components.
  experimental: {
    authInterrupts: true, // enables forbidden() for owner-only pages
    // Receipt uploads go through server actions: 4 MB file + multipart overhead.
    serverActions: { bodySizeLimit: "5mb" },
  },
  // @react-pdf/renderer ships its own font/layout engine; keep it unbundled.
  serverExternalPackages: ["@react-pdf/renderer"],
  // PDF fonts are read from disk at runtime; make sure Vercel bundles them.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@fontsource/inter/files/inter-latin*-{400,700}-normal.woff"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
