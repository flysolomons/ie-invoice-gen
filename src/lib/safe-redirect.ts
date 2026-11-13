/**
 * Only allow redirects to a path on this site after login. Rejects absolute
 * URLs, protocol-relative "//evil.com" and the "/\evil.com" variant that
 * browsers also treat as protocol-relative.
 */
export function safeRedirectPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    // Resolve against a dummy origin; anything that escapes it is external.
    const url = new URL(next, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
