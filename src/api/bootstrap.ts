import { apiFetch, AuthError, SetupRequiredError } from './client'
import type { Campaign, User } from '../types'

export interface BootstrapResult {
  user: User
  campaigns: Campaign[]
}

export async function fetchBootstrap(): Promise<BootstrapResult> {
  const res = await apiFetch('/api/bootstrap')
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}))
    if ((body as { setupRequired?: boolean }).setupRequired) {
      throw new SetupRequiredError()
    }
  }
  if (!res.ok) {
    throw new Error(`Bootstrap failed: ${res.status}`)
  }
  return res.json() as Promise<BootstrapResult>
}

export { AuthError, SetupRequiredError }
