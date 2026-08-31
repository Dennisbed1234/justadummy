import Link from 'next/link'

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        background: '#fff',
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>Login test</h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#333' }}>
          User and admin use different pages.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ border: '1px solid #ccc', padding: 12 }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>User</p>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#555' }}>
              Email → username → OTP #1 → OTP #2 → wait for approval
            </p>
            <Link
              href="/sign-in"
              style={{
                display: 'inline-block',
                padding: '8px 14px',
                border: '1px solid #999',
                background: '#f0f0f0',
                color: '#000',
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              Open user login
            </Link>
          </div>

          <div style={{ border: '1px solid #ccc', padding: 12 }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Admin</p>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#555' }}>
              Live attempts · approve / reject · plain-text details
            </p>
            <Link
              href="/ops"
              style={{
                display: 'inline-block',
                padding: '8px 14px',
                border: '1px solid #999',
                background: '#f0f0f0',
                color: '#000',
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              Open admin desk
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
