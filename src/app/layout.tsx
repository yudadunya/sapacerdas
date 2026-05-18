import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SapaCerdas — AI Persona Platform',
  description: 'Platform AI white-label untuk membangun database audiens secara organik',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
