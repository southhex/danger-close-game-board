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
