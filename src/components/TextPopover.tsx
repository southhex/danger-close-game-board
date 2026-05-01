import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  body: string
  children: React.ReactNode
}

export default function TextPopover({ title, body, children }: Props) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
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

  return (
    <>
      <span ref={triggerRef} onClick={() => setOpen(o => !o)} className="cursor-pointer">
        {children}
      </span>
      {open && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: coords.top - 8,
            left: coords.left,
            transform: 'translateY(-100%)',
            zIndex: 9999,
            width: '14rem',
          }}
          className="bg-surface border border-border rounded-md p-2 shadow-lg"
        >
          <div className="lbl mb-1 text-ok">{title.toUpperCase()}</div>
          <div className="text-[10px] text-muted leading-snug">{body}</div>
        </div>,
        document.body
      )}
    </>
  )
}
