interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
}

export default function Stepper({ value, onChange, min = -99, max = 99, label }: Props) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="flex items-center gap-2">
      {label && <div className="lbl text-[10px]">{label}</div>}
      <button onClick={() => onChange(clamp(value - 1))} className="text-muted text-sm w-5">−{/* U+2212 math minus, not hyphen */}</button>
      <div className="bg-bg border border-border rounded-xs px-3 py-0.5 text-xs text-ink font-mono min-w-[32px] text-center">{value}</div>
      <button onClick={() => onChange(clamp(value + 1))} className="text-muted text-sm w-5">+</button>
    </div>
  )
}
