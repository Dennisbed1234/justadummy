import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Login Ops Test',
  description: 'Multi-step login with double OTP and ops approval',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: '#0f1412', color: '#e8eeea', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
