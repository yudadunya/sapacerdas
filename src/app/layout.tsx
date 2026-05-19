import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SapaCerdas – AI Persona Platform',
  description: 'White-label AI persona untuk semua kebutuhan layanan publik dan bisnis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
