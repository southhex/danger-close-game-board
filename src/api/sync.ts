import { apiFetch } from './client'
import { useStore } from '../store'

let syncTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(doSync, 500)
}

async function doSync(): Promise<void> {
  const { currentCampaignId, troopers, mission, diceHistory } = useStore.getState()
  if (!currentCampaignId) return

  try {
    useStore.getState().setSyncStatus('syncing')
    await apiFetch(`/api/campaigns/${currentCampaignId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ troopers, mission, diceHistory }),
    })
    useStore.getState().setSyncStatus('idle')
  } catch {
    useStore.getState().setSyncStatus('error')
  }
}
