import ExportImport from './ExportImport'

export default function Settings() {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="lbl">SETTINGS</div>
      <section className="bg-surface border border-border p-3 flex flex-col gap-2">
        <div className="lbl text-[10px]">DATA</div>
        <ExportImport />
        <div className="text-[10px] text-muted italic">Saves persist automatically to your browser. Export to back up or move between devices.</div>
      </section>
      {/* Future: theme, dice prefs, reset options */}
    </div>
  )
}
