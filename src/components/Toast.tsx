import { useEffect } from 'react'

export interface ToastMsg {
  text: string
  tone: 'ok' | 'error'
  at: number
}

export default function Toast({ msg, onDone }: { msg: ToastMsg | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(onDone, msg.tone === 'error' ? 6000 : 3000)
    return () => clearTimeout(t)
  }, [msg, onDone])

  if (!msg) return null
  return (
    <div className={`toast toast-${msg.tone}`} role="status" key={msg.at}>
      {msg.text}
    </div>
  )
}
