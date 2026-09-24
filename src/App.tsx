import { useCallback, useEffect, useState } from 'react'
import { store } from './data'
import type { Assignment, CheckIn, NewAssignment, SiteKey } from './data'
import { CHECK_SITES } from './config'
import { localIsoDate } from './lib/dates'
import Header from './components/Header'
import CheckInPanel from './components/CheckInPanel'
import LogForm from './components/LogForm'
import TicketList from './components/TicketList'
import Toast, { type ToastMsg } from './components/Toast'

// One screen, as in the canvas app spec: check-in on top, intake below it, open tickets
// underneath. The check-in and intake share a surface on purpose: going to confirm the
// sites and finding somewhere to log what you found is one trip.

export default function App() {
  const [today, setToday] = useState(localIsoDate())
  const [now, setNow] = useState(() => new Date())
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null)
  const [tickets, setTickets] = useState<Assignment[] | null>(null)
  const [lastTick, setLastTick] = useState<string | null | undefined>(undefined)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const notify = useCallback((text: string, tone: ToastMsg['tone'] = 'ok') => setToast({ text, tone, at: Date.now() }), [])
  const clearToast = useCallback(() => setToast(null), [])

  const refresh = useCallback(async () => {
    try {
      const [open, tick] = await Promise.all([store.listOpenAssignments(), store.getLastTick()])
      setTickets(open)
      setLastTick(tick)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  // Today's check-in row is created lazily on first open each day. A day the app is never
  // opened has no row, which the Tick flow correctly reads as "not done".
  useEffect(() => {
    let cancelled = false
    store
      .getOrCreateCheckIn(today)
      .then((c) => !cancelled && setCheckIn(c))
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [today])

  // Re-read on open, on return to the tab (a flag cleared in Outlook closes a ticket via the
  // Tick flow), and every few minutes; tick the clock each minute so due labels and the day
  // roll over on their own.
  useEffect(() => {
    // Async fetch on mount; state is only set after the await resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    const clock = setInterval(() => {
      setNow(new Date())
      setToday(localIsoDate())
    }, 60_000)
    const poll = setInterval(() => void refresh(), 5 * 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(clock)
      clearInterval(poll)
    }
  }, [refresh])

  async function toggleSite(key: SiteKey, value: boolean) {
    if (!checkIn) return
    const before = checkIn
    setCheckIn({ ...checkIn, [key]: value })
    try {
      let row = await store.updateCheckIn(before.id, { [key]: value })
      // Writing CompletedAt immediately is what halts the nags: the next tick finds it set.
      // Un-ticking a box afterwards leaves it set on purpose.
      if (CHECK_SITES.every((s) => row[s.key]) && !row.completedAt) {
        row = await store.updateCheckIn(row.id, { completedAt: new Date() })
        notify('Check-in done: nags off until tomorrow')
      }
      setCheckIn(row)
    } catch (e) {
      setCheckIn(before)
      notify(`Couldn't save: ${e instanceof Error ? e.message : e}`, 'error')
    }
  }

  async function addTicket(a: NewAssignment) {
    const row = await store.addAssignment(a)
    setTickets((t) => (t ? [...t, row] : [row]))
    notify(`HW-${row.id} created: email on its way`)
  }

  async function completeTicket(t: Assignment) {
    setTickets((list) => list?.filter((x) => x.id !== t.id) ?? null)
    try {
      await store.completeAssignment(t.id)
      notify(`HW-${t.id} closed`)
    } catch (e) {
      setTickets((list) => (list ? [...list, t] : [t]))
      notify(`Couldn't close HW-${t.id}: ${e instanceof Error ? e.message : e}`, 'error')
    }
  }

  return (
    <div className="app">
      <Header lastTick={lastTick} now={now} mock={store.kind === 'mock'} />
      {loadError && <div className="alert">SharePoint error: {loadError}</div>}
      <main className="main">
        <CheckInPanel checkIn={checkIn} date={today} onToggle={toggleSite} />
        <LogForm onAdd={addTicket} onError={(m) => notify(m, 'error')} />
        <TicketList tickets={tickets} now={now} onDone={completeTicket} />
      </main>
      <Toast msg={toast} onDone={clearToast} />
    </div>
  )
}
