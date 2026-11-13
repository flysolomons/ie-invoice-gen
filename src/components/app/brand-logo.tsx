import { cn } from "cn";

/** Public URL of the uploaded logo. The version (its storage key) busts caches on re-upload. */
export function logoUrl(version: string) {
  return `/api/branding/logo?v=${encodeURIComponent(version)}`;
}

/**
 * The business logo, or a navy monogram when none is uploaded.
 * `logoVersion` is the logo's storage key from settings (null = no logo), so we
 * never render a broken image and a replaced logo shows immediately.
 * `plate` puts the logo on a white rounded tile so it reads on any background.
 */
export function BrandLogo({
  logoVersion,
  name,
  plate = false,
  plateClassName,
  className,
}: {
  logoVersion: string | null;
  name: string;
  plate?: boolean;
  /** Extra classes for the plate, e.g. padding. */
  plateClassName?: string;
  className?: string;
}) {
  const content = logoVersion ? (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic, user-uploaded logo
    <img src={logoUrl(logoVersion)} alt={name} className={cn("object-contain", className)} />
  ) : (
    <span
      aria-label={name}
      role="img"
      className={cn(
        "grid aspect-square place-items-center rounded-lg bg-brand-navy font-heading font-semibold text-white",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "I"}
    </span>
  );

  if (!plate || !logoVersion) return content;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-xl bg-white p-1.5 shadow-float ring-1 ring-black/5",
        plateClassName,
      )}
    >
      {content}
    </span>
  );
}
