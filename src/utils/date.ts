const pad = (n: number) => String(n).padStart(2, '0');

/** Build an ISO date string (YYYY-MM-DD) from parts. */
export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Validate numeric DD/MM/YYYY parts (real calendar date, sane year). */
export function isValidDateParts(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** ISO (2005-08-15) → "15/08/2005". */
export function formatDateDMY(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

/** Timestamp → "1 Oct 2026" (locale-aware, never throws). */
export function formatDateShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Timestamp → "1 Oct 2026, 14:32" (locale-aware, never throws). */
export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse a loosely formatted date of birth into ISO (YYYY-MM-DD).
 * Accepts "15/08/2005", "15-8-2005", "15082005". Returns null when invalid.
 */
export function parseFlexibleDOB(input: string): string | null {
  const cleaned = input.trim().replace(/\s+/g, '');
  let day: number;
  let month: number;
  let year: number;
  let match = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(cleaned);
  if (match) {
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  } else {
    match = /^(\d{2})(\d{2})(\d{4})$/.exec(cleaned);
    if (!match) return null;
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
  }
  if (!isValidDateParts(day, month, year)) return null;
  return toISODate(year, month, day);
}
