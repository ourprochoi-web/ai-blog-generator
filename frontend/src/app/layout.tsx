import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Daily Brief',
  description: 'AI-curated news, delivered twice daily',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
