import { useState, type FormEvent } from 'react'
import { PLATFORMS } from '../config'
import type { NewAssignment, Platform } from '../data'
import { combine, localIsoDate } from '../lib/dates'

interface Props {
  onAdd: (a: NewAssignment) => Promise<void>
  onError: (message: string) => void
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = [0, 15, 30, 45, 59]

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`

/** Guess the platform from the link so most entries need no dropdown change. */
function platformFromLink(link: string): Platform | null {
  const l = link.toLowerCase()
  if (l.includes('prairielearn')) return 'PrairieLearn'
  if (l.includes('cs173')) return 'CS173.tech'
  if (l.includes('smartphysics')) return 'SmartPhysics'
  if (l.includes('canvas')) return 'Canvas'
  return null
}

export default function LogForm({ onAdd, onError }: Props) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(localIsoDate())
  // 11:59 PM is what the overwhelming majority of deadlines are.
  const [hour, setHour] = useState(23)
  const [minute, setMinute] = useState(59)
  const [link, setLink] = useState('')
  const [platform, setPlatform] = useState<Platform>('Other')
  const [platformTouched, setPlatformTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  function onLink(v: string) {
    setLink(v)
    const guess = platformFromLink(v)
    if (guess && !platformTouched) setPlatform(guess)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return onError('Name required')
    const dueAt = combine(date, hour, minute)
    setBusy(true)
    try {
      await onAdd({ title: title.trim(), dueAt, link: link.trim(), platform })
      setTitle('')
      setLink('')
      setPlatformTouched(false)
      setPlatform('Other')
    } catch (err) {
      onError(`Couldn't create ticket: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2 className="panel-header">Log an assignment</h2>
      <form className="panel-body form" onSubmit={submit}>
        <label className="field field-wide">
          <span>Name</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="MATH 241 HW 8" autoComplete="off" />
        </label>

        <label className="field">
          <span>Due</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <div className="field">
          <span>Time</span>
          <div className="time">
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label="Hour">
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
            <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} aria-label="Minute">
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  :{String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="field field-wide">
          <span>Link</span>
          <input type="url" value={link} onChange={(e) => onLink(e.target.value)} placeholder="https://…" autoComplete="off" />
        </label>

        <label className="field">
          <span>Platform</span>
          <select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value as Platform)
              setPlatformTouched(true)
            }}
          >
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>

        <div className="field field-submit">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add ticket'}
          </button>
        </div>
      </form>
    </section>
  )
}
