import type { Metadata } from 'next'
import './globals.css'
import ConditionalNavbar from '@/components/layout/ConditionalNavbar'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Spectrum Student Data - JEE Dashboard',
  description: 'JEE Student Performance Tracking System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ConditionalNavbar />
          <div className="min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}

