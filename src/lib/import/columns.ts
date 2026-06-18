import Papa from "papaparse";

/** A source row paired with its 1-based physical line number (for diagnostics). */
export interface SourceRow {
  data: Record<string, string>;
  line: number;
}

/**
 * Parse CSV text into row objects keyed by their header, each tagged with its
 * true physical line number. Blank lines are dropped but do NOT shift the line
 * numbers of later rows (so "skipped row N" always points at the real line).
 */
export function parseCsv(text: string): { rows: SourceRow[]; headers: string[] } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: false,
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).map((h) => h.trim());

  const rows: SourceRow[] = [];
  result.data.forEach((data, i) => {
    const line = i + 2; // +1 header row, +1 to 1-index
    const isEmpty = Object.values(data).every(
      (v) => v == null || String(v).trim() === "",
    );
    if (isEmpty) return;
    rows.push({ data, line });
  });
  return { rows, headers };
}

/** Lowercase + strip non-alphanumerics, for tolerant header matching. */
export function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Find the first header whose normalized form matches one of the normalized
 * aliases. Returns the original header string (so callers can index the row).
 */
export function findColumn(
  headers: string[],
  aliases: string[],
): string | undefined {
  const wanted = new Set(aliases.map(normalizeKey));
  return headers.find((h) => wanted.has(normalizeKey(h)));
}

/** Read a row value by trying several header aliases. */
export function pick(
  row: Record<string, string>,
  headers: string[],
  aliases: string[],
): string | undefined {
  const col = findColumn(headers, aliases);
  if (!col) return undefined;
  const v = row[col];
  return v == null ? undefined : String(v).trim();
}

/**
 * Parse a number, tolerating currency symbols, spaces, US thousands separators,
 * and accounting-style negatives like `(100)` or `(1,234) USD`.
 *
 * NOTE: assumes US/`.`-decimal convention. EU-format values (e.g. `1.234,56`)
 * are NOT auto-detected — that requires an explicit per-import locale, which is
 * a known limitation tracked for a later phase.
 */
export function parseNumber(value: string | undefined): number | null {
  if (value == null) return null;
  let s = String(value).trim();
  if (s === "" || s === "-" || s.toLowerCase() === "nan") return null;

  // Accounting-style negative: a leading "(" with a matching ")" anywhere,
  // even when followed by a currency suffix, e.g. "(1,234) USD".
  const negative = /^\(/.test(s) && /\)/.test(s);

  // Drop everything except digits, decimal point, sign, and exponent markers.
  s = s.replace(/[^0-9.\-+eE]/g, "");

  // Reject residue that has no digit (e.g. "(", "USD", "N/A" -> "" / "-").
  if (!/[0-9]/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

/** Map free-form side text to "buy" | "sell" (handles long/short, B/S). */
export function parseSide(value: string | undefined): "buy" | "sell" | null {
  if (value == null) return null;
  const s = value.trim().toLowerCase();
  if (["buy", "b", "long", "bid"].includes(s)) return "buy";
  if (["sell", "s", "short", "ask"].includes(s)) return "sell";
  if (s.startsWith("buy") || s.startsWith("long")) return "buy";
  if (s.startsWith("sell") || s.startsWith("short")) return "sell";
  return null;
}

/**
 * Parse many broker timestamp formats into an ISO 8601 (UTC) string.
 *
 * Broker exports often emit a "naked" wall-clock with no timezone (MetaTrader
 * "2026.06.18 10:00:00", or "2026-06-18 10:00:00", or "2026-06-18T10:00:00").
 * `new Date()` would interpret those in the SERVER's local timezone, making
 * results deployment-dependent and able to mis-order fills. We therefore treat
 * every naked timestamp as UTC. Inputs that already carry `Z` or an offset, and
 * epoch values, are preserved as-is.
 */
export function parseDateToIso(value: string | undefined): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;

  // Epoch: seconds (10 digits) or milliseconds (13 digits).
  if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000).toISOString();
  if (/^\d{13}$/.test(s)) return new Date(Number(s)).toISOString();

  let candidate = s;

  // MetaTrader dotted date (optionally with time): 2026.06.18[ 10:00:00]
  const mt = /^(\d{4})[.](\d{2})[.](\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?$/.exec(s);
  // Naked ISO-ish date-time (space or T separated) with NO timezone.
  const naked = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)$/.exec(s);

  if (mt) {
    candidate = `${mt[1]}-${mt[2]}-${mt[3]}T${mt[4] ?? "00:00:00"}Z`;
  } else if (naked) {
    candidate = `${naked[1]}T${naked[2]}Z`;
  }

  const d = new Date(candidate);
  if (!Number.isNaN(d.getTime())) return d.toISOString();

  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
}
