import { STALE_TICK_MINUTES } from '../config'
import { parseLocalStamp, timeLabel, dayLabel } from '../lib/dates'

interface Props {
  lastTick: string | null | undefined
  now: Date
  mock: boolean
}

// The heartbeat is the only signal that says something when nothing arrives: a nag system's
// failure mode looks exactly like its success state, so a stale LastTick is shown loudly.
function heartbeat(lastTick: string | null | undefined, now: Date): { text: string; stale: boolean } {
  if (lastTick === undefined) return { text: 'Last tick: …', stale: false }
  if (!lastTick) return { text: 'Last tick: never, flow may be off', stale: true }
  const at = parseLocalStamp(lastTick)
  if (!at) return { text: `Last tick: ${lastTick}`, stale: false }
  const mins = Math.round((now.getTime() - at.getTime()) / 60_000)
  const when = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${dayLabel(at)} ${timeLabel(at)}`
  const stale = mins > STALE_TICK_MINUTES
  return { text: `Last tick: ${when}${stale ? ', flow may be off' : ''}`, stale }
}

export default function Header({ lastTick, now, mock }: Props) {
  const hb = heartbeat(lastTick, now)
  return (
    <header className="header">
      <h1 className="brand">Rubric</h1>
      {mock && (
        <span className="badge badge-warn" title="Using sample data. Run pa app add data-source to connect SharePoint.">
          mock data
        </span>
      )}
      <span className={`tick ${hb.stale ? 'tick-stale' : ''}`}>{hb.text}</span>
    </header>
  )
}
