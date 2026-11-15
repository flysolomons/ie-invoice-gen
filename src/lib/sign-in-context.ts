/** Pure helpers for the sign-in log (kept framework-free so they're easy to test). */

/** Longest stored email / user agent; anyone can submit the login form, so cap what we keep. */
const MAX_EMAIL = 254;
const MAX_USER_AGENT = 400;

export function clip(value: string | null | undefined, max: number): string | null {
  const v = value?.trim();
  return v ? v.slice(0, max) : null;
}

export function normaliseEmail(value: unknown): string | null {
  return typeof value === "string" ? clip(value.toLowerCase(), MAX_EMAIL) : null;
}

/**
 * Client IP from proxy headers. On Vercel `x-real-ip` / `x-forwarded-for` are set
 * by the platform; elsewhere they can be spoofed, so treat the value as a hint.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0];
  return clip(headers.get("x-real-ip") ?? forwarded, 64);
}

export function clientUserAgent(headers: Headers): string | null {
  return clip(headers.get("user-agent"), MAX_USER_AGENT);
}

/** "Chrome on Windows"-style label for the activity table. */
export function describeUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Other device";
}

export const SIGN_IN_REASONS: Record<string, string> = {
  invalid_credentials: "Wrong email or password",
  service_unavailable: "Sign-in service unreachable",
  not_on_team: "Not on the team",
  removed: "Removed from the team",
  microsoft_error: "Microsoft sign-in didn’t complete",
};
