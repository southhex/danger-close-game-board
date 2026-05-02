import type { Mission, MissionState, Squad } from '../types'

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

export class SetupRequiredError extends Error {
  constructor() {
    super('Setup required')
    this.name = 'SetupRequiredError'
  }
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(path, { credentials: 'include', ...options })
  if (res.status === 401) {
    throw new AuthError()
  }
  return res
}

async function jsonOrThrow<T>(res: Response, errorMsg: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? errorMsg)
  }
  return res.json() as Promise<T>
}

interface SquadServerShape {
  id: string
  campaignId: string
  data: {
    name?: string
    callsign?: string
    sergeantId?: string | null
    perks?: Squad['perks']
    notes?: string
  }
  created_at?: string
}

function squadFromServer(row: SquadServerShape): Squad {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.data.name ?? '',
    callsign: row.data.callsign ?? '',
    sergeantId: row.data.sergeantId ?? null,
    perks: row.data.perks ?? [],
    notes: row.data.notes ?? '',
    created_at: row.created_at,
  }
}

function squadToServerData(squad: Squad): SquadServerShape['data'] {
  return {
    name: squad.name,
    callsign: squad.callsign,
    sergeantId: squad.sergeantId,
    perks: squad.perks,
    notes: squad.notes,
  }
}

// ── Squads ─────────────────────────────────────────────────────────────────

export async function createSquadApi(
  campaignId: string,
  squad: Omit<Squad, 'id' | 'campaignId' | 'created_at'>,
): Promise<Squad> {
  const res = await apiFetch(`/api/campaigns/${campaignId}/squads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: squadToServerData({ ...squad, id: '', campaignId } as Squad) }),
  })
  const row = await jsonOrThrow<SquadServerShape>(res, 'Create squad failed')
  return squadFromServer(row)
}

export async function patchSquadApi(squad: Squad): Promise<Squad> {
  const res = await apiFetch(`/api/squads/${squad.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: squadToServerData(squad) }),
  })
  const row = await jsonOrThrow<SquadServerShape>(res, 'Patch squad failed')
  return squadFromServer(row)
}

export async function deleteSquadApi(id: string): Promise<void> {
  const res = await apiFetch(`/api/squads/${id}`, { method: 'DELETE' })
  await jsonOrThrow<{ ok: boolean }>(res, 'Delete squad failed')
}

// ── Missions ───────────────────────────────────────────────────────────────

interface MissionServerShape {
  id: string
  campaignId: string
  status: string
  data: Record<string, unknown>
  completed_at: string | null
  created_at: string
}

function missionFromServer(row: MissionServerShape): Mission {
  const d = row.data
  return {
    id: row.id,
    campaignId: row.campaignId,
    status: row.status as Mission['status'],
    name: typeof d['name'] === 'string' ? (d['name'] as string) : '',
    description: typeof d['description'] === 'string' ? (d['description'] as string) : undefined,
    difficulty: d['difficulty'] as Mission['difficulty'] | undefined,
    objectiveCategory: d['objectiveCategory'] as Mission['objectiveCategory'] | undefined,
    objectiveSubtype: d['objectiveSubtype'] as Mission['objectiveSubtype'] | undefined,
    airspace: d['airspace'] as Mission['airspace'] | undefined,
    insertion: d['insertion'] as Mission['insertion'] | undefined,
    squadId: typeof d['squadId'] === 'string' ? (d['squadId'] as string) : null,
    state: (d['state'] as MissionState | null | undefined) ?? null,
    fieldReport: typeof d['fieldReport'] === 'string' ? (d['fieldReport'] as string) : '',
    outcome: d['outcome'] as Mission['outcome'] | undefined,
    awardedReq: typeof d['awardedReq'] === 'number' ? (d['awardedReq'] as number) : undefined,
    completed_at: row.completed_at,
    created_at: row.created_at,
  }
}

function missionToServerData(m: Mission): Record<string, unknown> {
  return {
    name: m.name,
    description: m.description,
    difficulty: m.difficulty,
    objectiveCategory: m.objectiveCategory,
    objectiveSubtype: m.objectiveSubtype,
    airspace: m.airspace,
    insertion: m.insertion,
    squadId: m.squadId ?? null,
    state: m.state ?? null,
    fieldReport: m.fieldReport ?? '',
    outcome: m.outcome,
    awardedReq: m.awardedReq,
  }
}

export async function createMissionApi(
  campaignId: string,
  blueprint: Omit<Mission, 'id' | 'campaignId' | 'status' | 'created_at' | 'completed_at'>,
): Promise<Mission> {
  const res = await apiFetch(`/api/campaigns/${campaignId}/missions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: missionToServerData({
        ...blueprint,
        id: '',
        campaignId,
        status: 'blueprint',
      } as Mission),
    }),
  })
  return missionFromServer(await jsonOrThrow<MissionServerShape>(res, 'Create mission failed'))
}

export async function patchMissionBlueprintApi(mission: Mission): Promise<Mission> {
  const res = await apiFetch(`/api/missions/${mission.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: missionToServerData(mission) }),
  })
  return missionFromServer(await jsonOrThrow<MissionServerShape>(res, 'Patch mission failed'))
}

export async function patchMissionFieldReportApi(
  missionId: string,
  fieldReport: string,
): Promise<Mission> {
  const res = await apiFetch(`/api/missions/${missionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fieldReport }),
  })
  return missionFromServer(await jsonOrThrow<MissionServerShape>(res, 'Patch field report failed'))
}

export async function deleteMissionApi(id: string): Promise<void> {
  const res = await apiFetch(`/api/missions/${id}`, { method: 'DELETE' })
  await jsonOrThrow<{ ok: boolean }>(res, 'Delete mission failed')
}

export async function deployMissionApi(missionId: string, squadId: string): Promise<Mission> {
  const res = await apiFetch(`/api/missions/${missionId}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ squadId }),
  })
  return missionFromServer(await jsonOrThrow<MissionServerShape>(res, 'Deploy mission failed'))
}

export interface CompleteMissionResult {
  mission: Mission
  reqAwarded: number
  campaignReq: number
}

export async function completeMissionApi(
  missionId: string,
  body: { fieldReport: string; outcome: 'victory' | 'defeat' | 'aborted'; awardedReq?: number },
): Promise<CompleteMissionResult> {
  const res = await apiFetch(`/api/missions/${missionId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const raw = await jsonOrThrow<{
    mission: MissionServerShape
    reqAwarded: number
    campaignReq: number
  }>(res, 'Complete mission failed')
  return {
    mission: missionFromServer(raw.mission),
    reqAwarded: raw.reqAwarded,
    campaignReq: raw.campaignReq,
  }
}

export async function putMissionStateApi(
  missionId: string,
  data: MissionState,
): Promise<void> {
  const res = await apiFetch(`/api/missions/${missionId}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  await jsonOrThrow<{ ok: boolean }>(res, 'Save mission state failed')
}

// ── REQ ────────────────────────────────────────────────────────────────────

export async function patchReqApi(campaignId: string, req: number): Promise<{ id: string; req: number }> {
  const res = await apiFetch(`/api/campaigns/${campaignId}/req`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req }),
  })
  return jsonOrThrow<{ id: string; req: number }>(res, 'Patch REQ failed')
}

export interface SpendReqResult {
  id: string
  req: number
  trooper: { id: string; data: Record<string, unknown> }
}

export async function spendReqApi(
  campaignId: string,
  body: { amount: number; trooperId: string; gearChange: { slot: string; name: string | null } },
): Promise<SpendReqResult> {
  const res = await apiFetch(`/api/campaigns/${campaignId}/req/spend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return jsonOrThrow<SpendReqResult>(res, 'Spend REQ failed')
}

export async function patchCampaignSettingsApi(
  campaignId: string,
  patch: { defaultAirspace?: 'contested' | 'friendly' | 'denied'; reqEnabled?: boolean },
): Promise<void> {
  const res = await apiFetch(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  await jsonOrThrow<unknown>(res, 'Patch campaign failed')
}
