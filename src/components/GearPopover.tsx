import { useState, useRef, useEffect } from 'react'
import type { GearItem } from '../types'

interface Props {
  gear: GearItem | undefined
  children: React.ReactNode
}

export default function GearPopover({ gear, children }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])
  if (!gear) return <>{children}</>
  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="text-left">{children}</button>
      {open && (
        <div className="absolute z-30 bottom-full mb-1 left-0 w-64 bg-surface border border-border p-2 shadow-lg">
          <div className="lbl mb-1">{gear.name}</div>
          <div className="text-[10px] text-muted leading-snug whitespace-pre-line">{gear.properties}</div>
          <div className="text-[10px] text-muted mt-2">MOB {gear.mobility_cost} · REQ {gear.reqcost}{gear.max_uses > 0 ? ` · USES ${gear.max_uses}` : ''}</div>
        </div>
      )}
    </div>
  )
}
