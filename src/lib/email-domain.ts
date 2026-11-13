/** Domain part of an email, lower-cased ("" if malformed). */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at > 0 ? email.slice(at + 1).trim().toLowerCase() : "";
}

/**
 * Exact domain match only: "flysolomons.com" does NOT allow "evil-flysolomons.com"
 * or "flysolomons.com.attacker.io".
 */
export function isAllowedDomain(email: string, allowed: readonly string[]): boolean {
  const domain = emailDomain(email);
  return domain !== "" && allowed.includes(domain);
}
