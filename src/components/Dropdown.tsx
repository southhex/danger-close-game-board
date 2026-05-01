interface Option { value: string; label: string; disabled?: boolean }
interface Props {
  value: string
  options: Option[]
  onChange: (v: string) => void
  label?: string
  className?: string
}

export default function Dropdown({ value, options, onChange, label, className }: Props) {
  return (
    <div className={className}>
      {label && <div className="lbl mb-1 text-[10px]">{label}</div>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-bg border border-border rounded-md text-ink text-xs px-2 py-1 focus:outline-none focus:border-accent"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
