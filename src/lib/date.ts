/**
 * Local-date helpers — app streak / daily keys must use the user's
 * local timezone (not UTC). `toISOString().slice(0,10)` is UTC and off by
 * one for IST (+5:30) users around midnight.
 */

export function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localTodayISO(): string {
  return localISODate(new Date());
}
