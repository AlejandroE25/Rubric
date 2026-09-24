// All display is in the browser's local time. The code app talks to SharePoint through the
// connector in ISO/UTC, and JS Date does the conversion, so none of the canvas app's
// local-vs-UTC asymmetry applies here.

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD: the CheckIns Title and the Tick flow's localDate. */
export function localIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local timestamp in the same shape the Tick flow writes to Runtime.LastTick. */
export function localStamp(d: Date): string {
  return `${localIsoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Parse a LastTick value (local, no offset) back into a Date. */
export function parseLocalStamp(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s.trim())
  if (!m) return null
  const [, y, mo, d, h, mi, se] = m
  return new Date(+y, +mo - 1, +d, +h, +mi, se ? +se : 0)
}

export function timeLabel(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function dayLabel(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })
}

export function hoursUntil(d: Date, now: Date = new Date()): number {
  return (d.getTime() - now.getTime()) / 3_600_000
}

/** "overdue", "due in 5h · 11:59 PM", or "Fri 9/19 · 11:59 PM", as in the canvas app spec. */
export function dueLabel(d: Date, now: Date = new Date()): string {
  const h = hoursUntil(d, now)
  if (h < 0) return `overdue · was ${dayLabel(d)} ${timeLabel(d)}`
  if (h < 1) return `due in ${Math.max(1, Math.round(h * 60))}m · ${timeLabel(d)}`
  if (h < 24) return `due in ${Math.floor(h)}h · ${timeLabel(d)}`
  return `${dayLabel(d)} · ${timeLabel(d)}`
}

export function isWeekday(d: Date = new Date()): boolean {
  const day = d.getDay()
  return day >= 1 && day <= 5
}

/** Combine a YYYY-MM-DD date input with an hour and minute into a local Date. */
export function combine(date: string, hour: number, minute: number): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute, 0, 0)
}
