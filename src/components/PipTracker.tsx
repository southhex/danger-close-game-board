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
  const toggle = (i: number) => {
    // Click pip at index i sets value to i+1; clicking the highest filled pip decrements.
    const next = (i + 1 === value) ? i : i + 1
    onChange(Math.max(0, Math.min(max, next)))
  }
  return (
    <div>
      {label && <div className="lbl mb-1 text-[10px]">{label}</div>}
      <div className="flex gap-1">
        {pips.map((filled, i) => (
          <button key={i} onClick={() => toggle(i)}
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
