interface Props {
  value: number
  max: number
  onChange: (v: number) => void
  label?: string
  size?: number
  color?: string
}

export default function PipTracker({ value, max, onChange, label, size = 10, color = '#5a9e6e' }: Props) {
  const pips = Array.from({ length: max }, (_, i) => i < value)
  const toggle = (i: number, filled: boolean) => {
    // clicking a filled pip sets value to that index (clears it and all above)
    // clicking an empty pip sets value to i+1 (fills up to and including it)
    const next = filled ? i : i + 1
    onChange(Math.max(0, Math.min(max, next)))
  }
  return (
    <div>
      {label && <div className="lbl mb-1 text-[10px]">{label}</div>}
      <div className="flex gap-1">
        {pips.map((filled, i) => (
          <button key={i} onClick={() => toggle(i, filled)}
            aria-label={`${label ?? 'pip'} ${i + 1}`}
            style={{
              width: size, height: size,
              background: filled ? color : 'transparent',
              borderRadius: '50%',
              border: `1px solid ${filled ? color : '#3a4a3a'}`,
            }} />
        ))}
      </div>
    </div>
  )
}
