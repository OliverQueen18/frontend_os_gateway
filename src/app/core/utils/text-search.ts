export function matchesSearch(query: string | null | undefined, ...parts: unknown[]): boolean {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => String(p ?? '').toLowerCase().includes(q));
}
