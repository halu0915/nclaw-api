/**
 * Stable date formatters that produce the SAME output on server and client.
 *
 * Why: `new Date(x).toLocaleString(...)` runs in the host's local timezone,
 * which differs between Node (UTC on Vercel) and the browser → React 19
 * hydration mismatch (react-doctor/rendering-hydration-mismatch-time).
 *
 * Fix: pin `timeZone: 'Asia/Taipei'` so both sides emit identical strings.
 */

const TZ = "Asia/Taipei";

const DATE_FMT = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DATETIME_FMT = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const DATETIME_SEC_FMT = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TZ,
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatDate(iso: string | number | Date): string {
  return DATE_FMT.format(new Date(iso));
}

export function formatDateTime(iso: string | number | Date): string {
  return DATETIME_FMT.format(new Date(iso));
}

export function formatDateTimeSec(iso: string | number | Date): string {
  return DATETIME_SEC_FMT.format(new Date(iso));
}
