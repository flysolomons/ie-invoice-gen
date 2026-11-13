import { BrandLogo } from "@/components/app/brand-logo";

/** Navy brand half of the split-screen login, with a gold/green swoosh echoing the logo. */
export function BrandPanel({
  businessName,
  logoVersion,
}: {
  businessName: string;
  logoVersion: string | null;
}) {
  return (
    <aside className="relative hidden overflow-hidden bg-brand-navy text-white lg:flex lg:flex-col lg:justify-between lg:p-12 lg:pb-56">
      {/* Soft glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-24 size-80 rounded-full bg-brand-gold/20 blur-3xl"
      />

      <div className="relative">
        <BrandLogo
          logoVersion={logoVersion}
          name={businessName}
          plate
          plateClassName="rounded-2xl p-3 shadow-lg shadow-black/20"
          className="h-20 w-auto"
        />
      </div>

      <div className="relative max-w-md space-y-4">
        <h2 className="text-4xl leading-tight font-semibold">
          Invoicing &amp; receipts for {businessName}
        </h2>
        <p className="text-lg text-white/75">
          Issue invoices, record payments and keep every receipt in one place.
        </p>
      </div>

      <p className="relative text-sm text-white/60">© {new Date().getFullYear()} {businessName}</p>

      {/* Swoosh, drawn in SVG so it stays crisp and themeable */}
      <svg
        aria-hidden
        viewBox="0 0 600 400"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full"
      >
        <path
          d="M0 330 C 160 250, 280 380, 420 300 S 560 190, 600 210 L600 400 L0 400 Z"
          className="fill-brand-green/70"
        />
        <path
          d="M0 300 C 150 230, 290 350, 430 270 S 560 170, 600 180"
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          className="stroke-brand-gold"
        />
      </svg>
    </aside>
  );
}
