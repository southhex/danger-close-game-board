interface Props {
  value: number
  max: number
  onChange: (v: number) => void
  label?: string
  color?: string
}

export default function PipTracker({ value, max, onChange, label, color = 'oklch(0.76 0.13 155)' }: Props) {
  const toggle = (i: number, filled: boolean) => {
    const next = filled ? i : i + 1
    onChange(Math.max(0, Math.min(max, next)))
  }
  return (
    <div>
      {label && <div className="lbl mb-1">{label}</div>}
      <div className="flex gap-[3px]">
        {Array.from({ length: max }, (_, i) => {
          const filled = i < value
          return (
            <button key={i} onClick={() => toggle(i, filled)}
              aria-label={`${label ?? 'pip'} ${i + 1}`}
              style={{
                width: 18, height: 6,
                borderRadius: 3,
                background: filled ? color : 'oklch(0.26 0.005 130)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }} />
          )
        })}
      </div>
    </div>
  )
}
