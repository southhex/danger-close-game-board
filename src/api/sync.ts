import { apiFetch, putMissionStateApi } from './client'
import { useStore } from '../store'

let syncTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(doSync, 500)
}

async function doSync(): Promise<void> {
  const { currentCampaignId, troopers, mission, diceHistory, campaigns } = useStore.getState()
  if (!currentCampaignId) return

  try {
    useStore.getState().setSyncStatus('syncing')

    // Sync troopers + dice history to campaign state endpoint
    await apiFetch(`/api/campaigns/${currentCampaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ troopers, diceHistory }),
    })

    // Sync live mission state to mission state endpoint when a live mission exists
    const currentCampaign = campaigns.find(c => c.id === currentCampaignId)
    const liveMissionId = currentCampaign?.currentMissionId
    if (mission && liveMissionId) {
      await putMissionStateApi(liveMissionId, mission)
    }

    useStore.getState().setSyncStatus('idle')
  } catch {
    useStore.getState().setSyncStatus('error')
  }
}
