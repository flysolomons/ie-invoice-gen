/** "Jane Mary Doe" → "JD", "Test Sales (dummy)" → "TD"; ignores non-letters. "?" if none. */
export function initials(name: string): string {
  const words = name.match(/\p{L}[\p{L}'-]*/gu) ?? [];
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}
