import { CHECK_SITES } from '../config'
import type { CheckIn, SiteKey } from '../data'
import { isWeekday, timeLabel } from '../lib/dates'

interface Props {
  checkIn: CheckIn | null
  date: string
  onToggle: (key: SiteKey, value: boolean) => void
}

export default function CheckInPanel({ checkIn, date, onToggle }: Props) {
  const [y, m, d] = date.split('-').map(Number)
  const day = new Date(y, m - 1, d)
  const heading = day.toLocaleDateString([], { weekday: 'long', month: 'numeric', day: 'numeric' })
  const left = checkIn ? CHECK_SITES.filter((s) => !checkIn[s.key]).length : CHECK_SITES.length

  let status: { text: string; tone: 'ok' | 'bad' | 'muted' }
  if (!checkIn) status = { text: 'Loading…', tone: 'muted' }
  else if (checkIn.completedAt) status = { text: `Checked in at ${timeLabel(checkIn.completedAt)}`, tone: 'ok' }
  else status = { text: `${left} site${left === 1 ? '' : 's'} left`, tone: 'bad' }

  return (
    <section className="panel">
      <h2 className="panel-header">
        <span>Check-in · {heading}</span>
        {!isWeekday(day) && <span className="panel-note">weekend, no nags</span>}
      </h2>
      <div className="panel-body">
        <div className="sites">
          {CHECK_SITES.map((s) => {
            const on = checkIn?.[s.key] ?? false
            return (
              <label key={s.key} className={`site ${on ? 'site-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!checkIn}
                  onChange={(e) => onToggle(s.key, e.target.checked)}
                />
                <span className="site-box" aria-hidden>
                  {on ? '✓' : ''}
                </span>
                <span>{s.label}</span>
              </label>
            )
          })}
        </div>
        <p className={`status status-${status.tone}`}>
          <span className="dot" aria-hidden /> {status.text}
        </p>
      </div>
    </section>
  )
}
