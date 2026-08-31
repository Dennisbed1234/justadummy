import Link from 'next/link'

export default function Home() {
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
        gap: 16,
      }}
    >
      <p style={{ letterSpacing: 2, color: '#8fbfa8', fontSize: 12, textTransform: 'uppercase' }}>
        Standalone test project
      </p>
      <h1 style={{ margin: 0, fontSize: 32 }}>Login Ops Test</h1>
      <p style={{ color: '#c5d4cc', maxWidth: 420 }}>
        Email → username → OTP #1 → new OTP #2 → ops approval. Not related to Apex Bank.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/sign-in"
          style={{
            background: '#c6f36b',
            color: '#102016',
            padding: '12px 20px',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Sign in
        </Link>
        <Link
          href="/ops"
          style={{
            border: '1px solid #ffffff22',
            padding: '12px 20px',
            borderRadius: 999,
            textDecoration: 'none',
          }}
        >
          Operations desk
        </Link>
      </div>
    </main>
  )
}
