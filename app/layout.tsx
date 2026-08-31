import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login test',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#ffffff',
          color: '#000000',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  )
}
