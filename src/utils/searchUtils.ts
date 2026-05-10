// Strip HTML tags + decode the few entities we use for rich-text notes.
function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Returns true if `query` is empty/whitespace, or any provided field contains
// `query` as a case-insensitive substring. HTML tags in fields are stripped.
export function matchesQuery(
  query: string,
  ...fields: (string | number | null | undefined)[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  for (const f of fields) {
    if (f == null) continue;
    const s = typeof f === "number" ? String(f) : stripHtml(f);
    if (s.toLowerCase().includes(q)) return true;
  }
  return false;
}
