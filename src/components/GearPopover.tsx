import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import type { GearItem } from '../types'

interface Props {
  gear: GearItem | undefined
  children: React.ReactNode
}

export default function GearPopover({ gear, children }: Props) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setCoords({ top: r.top + window.scrollY, left: r.left + window.scrollX })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!gear) return <>{children}</>

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(o => !o)} className="text-left">
        {children}
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: coords.top - 8,
            left: coords.left,
            transform: 'translateY(-100%)',
            zIndex: 9999,
            width: '16rem',
          }}
          className="bg-surface border border-border p-2 shadow-lg"
        >
          <div className="lbl mb-1">{gear.name}</div>
          <div className="text-[10px] text-muted leading-snug whitespace-pre-line">{gear.properties}</div>
          <div className="text-[10px] text-muted mt-2">MOB {gear.mobility_cost} · REQ {gear.reqcost}{gear.max_uses > 0 ? ` · USES ${gear.max_uses}` : ''}</div>
        </div>,
        document.body
      )}
    </>
  )
}
