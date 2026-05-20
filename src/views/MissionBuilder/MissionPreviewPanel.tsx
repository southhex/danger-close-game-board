import type {
  Airspace,
  MissionDifficulty,
  MissionInsertion,
  MissionObjectiveCategory,
  MissionObjectiveSubtype,
  MissionSector,
  SectorRole,
} from '../../types'

interface Props {
  name:              string
  difficulty:        MissionDifficulty
  airspace:          Airspace
  objectiveCategory: MissionObjectiveCategory
  objectiveSubtype:  MissionObjectiveSubtype
  insertion:         MissionInsertion
  stealthStart:      boolean
  sectors:           MissionSector[]
}

const DIFFICULTY_LABEL: Record<MissionDifficulty, string> = {
  routine: 'ROUTINE', hazardous: 'HAZARDOUS', desperate: 'DESPERATE',
}

const DIFFICULTY_COLOR: Record<MissionDifficulty, string> = {
  routine:   'text-ok border-ok',
  hazardous: 'text-warn border-warn',
  desperate: 'text-bad border-bad',
}

const OBJECTIVE_LABEL: Record<MissionObjectiveCategory, string> = {
  seize_secure: 'Seize & Secure', hit_run: 'Hit & Run', defensive: 'Defensive',
}

const SUBTYPE_LABEL: Record<MissionObjectiveSubtype, string> = {
  assault: 'Assault', search_destroy: 'Search & Destroy', breach: 'Breach',
  raid: 'Raid', recon: 'Recon', extraction: 'Extraction', recovery: 'Recovery', sabotage: 'Sabotage',
  siege: 'Siege', evacuation: 'Evacuation', last_stand: 'Last Stand',
}

const ROLE_LABEL: Record<SectorRole, string> = {
  standard: 'STD', lz: 'LZ', ez: 'EZ', objective: 'OBJ',
}

const ROLE_COLOR: Record<SectorRole, string> = {
  standard:  'border-border text-muted',
  lz:        'border-ok text-ok',
  ez:        'border-muted text-muted',
  objective: 'border-warn text-warn',
}

function contentsGlyph(s: MissionSector): string {
  if (s.rollContents) return '?'
  switch (s.contentsType) {
    case 'boon':   return '◆'
    case 'empty':  return '·'
    default:       return '⚔'
  }
}

export default function MissionPreviewPanel(props: Props) {
  const { name, difficulty, airspace, objectiveCategory, objectiveSubtype, insertion, stealthStart, sectors } = props

  return (
    <section className="bg-surface border border-border rounded-md p-3 flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-widest text-muted">Mission Preview</div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-[13px] text-ink font-mono truncate">{name || 'Untitled Mission'}</div>
        <span className={`text-[9px] font-bold tracking-widest border px-1.5 py-0.5 ${DIFFICULTY_COLOR[difficulty]}`}>
          {DIFFICULTY_LABEL[difficulty]}
        </span>
        <span className="text-[10px] text-muted font-mono uppercase tracking-wide">
          {OBJECTIVE_LABEL[objectiveCategory]} · {SUBTYPE_LABEL[objectiveSubtype]}
        </span>
        <span className="text-[10px] text-subtle font-mono">
          · Airspace: {airspace}
        </span>
        <span className="text-[10px] text-subtle font-mono">
          · LZ: {insertion.lz}{insertion.ez ? ` · EZ: ${insertion.ez}` : ''}
        </span>
        {stealthStart && (
          <span className="text-[9px] font-bold tracking-widest border border-ok text-ok px-1.5 py-0.5">
            STEALTH START
          </span>
        )}
      </div>

      {/* Sector flow */}
      <div className="flex items-center gap-1 flex-wrap pt-1">
        {sectors.length === 0 ? (
          <div className="text-[10px] text-subtle font-mono">No sectors yet</div>
        ) : (
          sectors.map((s, i) => {
            const role = s.role ?? 'standard'
            return (
              <div key={s.id} className="flex items-center gap-1">
                <div
                  className={`flex items-center gap-1 text-[10px] font-mono border px-1.5 py-0.5 ${ROLE_COLOR[role]}`}
                  title={`${s.name || '(unnamed)'} — ${ROLE_LABEL[role]}`}
                >
                  <span className="font-bold">{ROLE_LABEL[role]}</span>
                  <span className="text-ink truncate max-w-[100px]">{s.name || `S${i + 1}`}</span>
                  <span className="text-subtle">{contentsGlyph(s)}</span>
                </div>
                {i < sectors.length - 1 && <span className="text-subtle text-[10px]">▸</span>}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
