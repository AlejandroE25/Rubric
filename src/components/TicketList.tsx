import type { Assignment } from '../data'
import { dueLabel, hoursUntil, localIsoDate } from '../lib/dates'

interface Props {
  tickets: Assignment[] | null
  now: Date
  onDone: (t: Assignment) => void
}

type Group = { key: string; label: string; items: Assignment[] }

function group(tickets: Assignment[], now: Date): Group[] {
  const today = localIsoDate(now)
  const sorted = [...tickets].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  const groups: Group[] = [
    { key: 'overdue', label: 'Overdue', items: [] },
    { key: 'today', label: 'Due today', items: [] },
    { key: 'later', label: 'Upcoming', items: [] },
  ]
  for (const t of sorted) {
    if (t.dueAt < now) groups[0].items.push(t)
    else if (localIsoDate(t.dueAt) === today) groups[1].items.push(t)
    else groups[2].items.push(t)
  }
  return groups.filter((g) => g.items.length)
}

export default function TicketList({ tickets, now, onDone }: Props) {
  return (
    <section className="panel">
      <h2 className="panel-header">
        <span>Open tickets{tickets ? ` (${tickets.length})` : ''}</span>
      </h2>
      <div className="panel-body tickets">
        {tickets === null && <p className="empty">Loading…</p>}
        {tickets?.length === 0 && <p className="empty">Nothing open. Enjoy it.</p>}
        {tickets &&
          group(tickets, now).map((g) => (
            <div key={g.key} className="group">
              <h3 className={`group-label group-${g.key}`}>{g.label}</h3>
              {g.items.map((t) => {
                const h = hoursUntil(t.dueAt, now)
                const tone = h < 0 ? 'overdue' : h < 24 ? 'soon' : 'later'
                return (
                  <article key={t.id} className="ticket">
                    <div className="ticket-main">
                      <div className="ticket-title">
                        <span className="ticket-id">HW-{t.id}</span>
                        {t.link ? (
                          <a href={t.link} target="_blank" rel="noopener noreferrer">
                            {t.title}
                          </a>
                        ) : (
                          <span>{t.title}</span>
                        )}
                      </div>
                      <div className="ticket-meta">
                        <span className={`due due-${tone}`}>{dueLabel(t.dueAt, now)}</span>
                        <span className="platform">{t.platform}</span>
                      </div>
                    </div>
                    <div className="ticket-actions">
                      {t.link && (
                        <a className="btn" href={t.link} target="_blank" rel="noopener noreferrer">
                          Open ↗
                        </a>
                      )}
                      <button className="btn btn-done" onClick={() => onDone(t)}>
                        Done
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ))}
      </div>
    </section>
  )
}
