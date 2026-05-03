import { useState } from 'react'
import Modal from '../../components/Modal'
import { useStore } from '../../store'
import type { Mission, Squad, Trooper } from '../../types'

interface DeployConfirmModalProps {
  mission: Mission
  onClose: () => void
}

const DIFFICULTY_LABEL: Record<string, string> = {
  routine: 'ROUTINE',
  hazardous: 'HAZARDOUS',
  desperate: 'DESPERATE',
}

const DIFFICULTY_COLOR: Record<string, string> = {
  routine: 'text-[#5a9e6e] border-[#5a9e6e]',
  hazardous: 'text-[#c8a030] border-[#c8a030]',
  desperate: 'text-[#c93535] border-[#c93535]',
}

const OBJECTIVE_LABEL: Record<string, string> = {
  seize_secure: 'SEIZE & SECURE',
  hit_run: 'HIT & RUN',
  defensive: 'DEFENSIVE',
}

export default function DeployConfirmModal({ mission, onClose }: DeployConfirmModalProps) {
  const allSquads = useStore(s => s.squads)
  const allTroopers = useStore(s => s.troopers)
  const currentCampaignId = useStore(s => s.currentCampaignId)
  const deployMission = useStore(s => s.deployMission)

  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter to squads in current campaign that have at least 1 member
  const eligibleSquads = allSquads.filter(sq => {
    if (sq.campaignId !== currentCampaignId) return false
    const memberCount = allTroopers.filter(t => t.squadId === sq.id).length
    return memberCount > 0
  })

  const selectedSquad: Squad | undefined = selectedSquadId
    ? eligibleSquads.find(sq => sq.id === selectedSquadId)
    : undefined

  const selectedMembers: Trooper[] = selectedSquad
    ? allTroopers.filter(t => t.squadId === selectedSquad.id)
    : []

  // Build warnings for selected squad
  const warnings: string[] = []
  if (selectedSquad) {
    if (!selectedSquad.sergeantId) {
      warnings.push('No sergeant assigned to this squad.')
    }
    const recoveringCount = selectedMembers.filter(t => t.recovering).length
    if (recoveringCount > 0) {
      warnings.push(
        recoveringCount === 1
          ? '1 trooper is recovering.'
          : `${recoveringCount} troopers are recovering.`,
      )
    }
  }

  const canDeploy = selectedSquadId !== null && eligibleSquads.length > 0 && !deploying

  async function handleDeploy() {
    if (!selectedSquadId) return
    setDeploying(true)
    setError(null)
    try {
      await deployMission(mission.id, selectedSquadId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deploy failed. Please try again.')
      setDeploying(false)
    }
  }

  const difficultyKey = mission.difficulty ?? ''
  const objectiveKey = mission.objectiveCategory ?? ''

  return (
    <Modal open onClose={onClose} title="DEPLOY MISSION" width="min(90vw, 520px)">
      <div className="flex flex-col gap-4">

        {/* Mission header */}
        <div>
          <div className="text-[13px] text-[#bbbaa8] font-mono mb-1">{mission.name || 'Untitled Mission'}</div>
          <div className="flex items-center gap-2 flex-wrap">
            {difficultyKey && DIFFICULTY_LABEL[difficultyKey] && (
              <span className={`text-[9px] font-bold tracking-widest border px-1.5 py-0.5 ${DIFFICULTY_COLOR[difficultyKey] ?? 'text-[#687868] border-[#2c3a2c]'}`}>
                {DIFFICULTY_LABEL[difficultyKey]}
              </span>
            )}
            {objectiveKey && OBJECTIVE_LABEL[objectiveKey] && (
              <span className="text-[10px] text-[#687868] font-mono uppercase tracking-wide">
                {OBJECTIVE_LABEL[objectiveKey]}
              </span>
            )}
          </div>
        </div>

        {/* Squad selection */}
        <div>
          <div className="text-[9px] text-[#687868] tracking-widest uppercase mb-2">SELECT SQUAD</div>

          {eligibleSquads.length === 0 ? (
            <div className="text-[11px] text-[#687868] font-mono border border-[#2c3a2c] rounded-md p-3">
              No squads available. Create a squad in Barracks.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {eligibleSquads.map(squad => {
                const members = allTroopers.filter(t => t.squadId === squad.id)
                const sergeant = squad.sergeantId
                  ? allTroopers.find(t => t.id === squad.sergeantId)
                  : null
                const isSelected = selectedSquadId === squad.id

                return (
                  <button
                    key={squad.id}
                    type="button"
                    onClick={() => setSelectedSquadId(squad.id)}
                    className={`text-left border rounded-md p-3 transition-colors ${
                      isSelected
                        ? 'border-[#5a9e6e] bg-[#5a9e6e]/5'
                        : 'border-[#2c3a2c] bg-[#1c2119] hover:border-[#5a9e6e]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {/* Radio indicator */}
                      <span className={`w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-[#5a9e6e]' : 'border-[#687868]'
                      }`}>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5a9e6e]" />
                        )}
                      </span>
                      <span className="text-[12px] text-[#bbbaa8] font-mono">{squad.name}</span>
                      <span className="text-[10px] text-[#687868] font-mono ml-auto">
                        {members.length}/5
                      </span>
                    </div>

                    {/* Sergeant line */}
                    <div className="text-[10px] text-[#687868] font-mono ml-5 mb-1.5">
                      {sergeant ? `Sgt. ${sergeant.name}` : 'No sergeant assigned'}
                      {' · '}
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </div>

                    {/* Trooper pills */}
                    {members.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-5">
                        {members.map(t => (
                          <span
                            key={t.id}
                            className={`text-[9px] font-mono border px-1.5 py-0.5 rounded-sm ${
                              t.recovering
                                ? 'text-[#d45f27] border-[#d45f27]/50'
                                : 'text-[#687868] border-[#2c3a2c]'
                            }`}
                          >
                            {t.name}
                            {t.recovering && ' (RECOVERING)'}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="border border-[#c8a030]/40 rounded-md p-3 bg-[#c8a030]/5">
            <div className="text-[9px] text-[#c8a030] tracking-widest uppercase mb-2">WARNINGS</div>
            <div className="flex flex-col gap-1.5">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-[#c8a030] text-[11px] leading-none mt-0.5">⚠</span>
                  <span className="text-[11px] text-[#bbbaa8] font-mono">{w}</span>
                </div>
              ))}
            </div>
            {selectedMembers.some(t => t.recovering) && (
              <div className="text-[10px] text-[#687868] font-mono mt-2 border-t border-[#c8a030]/20 pt-2">
                Recovering troopers deploy at full status. They will auto-clear when not selected next mission.
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-[11px] text-[#c93535] font-mono border border-[#c93535]/40 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#2c3a2c]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-[11px] font-mono text-[#687868] border border-[#2c3a2c] hover:text-[#bbbaa8]"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleDeploy}
            disabled={!canDeploy}
            className={`px-4 py-1.5 text-[11px] font-mono border transition-colors ${
              canDeploy
                ? 'text-[#5a9e6e] border-[#5a9e6e] hover:bg-[#5a9e6e]/10'
                : 'text-[#687868] border-[#2c3a2c] opacity-40 cursor-not-allowed'
            }`}
          >
            {deploying ? 'DEPLOYING…' : 'DEPLOY →'}
          </button>
        </div>

      </div>
    </Modal>
  )
}
