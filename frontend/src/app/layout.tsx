import type { Metadata } from 'next'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aidailybrief.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AI Daily Brief',
    template: '%s | AI Daily Brief',
  },
  description: 'AI-curated news and insights on artificial intelligence, machine learning, and tech breakthroughs. Delivered twice daily.',
  keywords: ['AI', 'artificial intelligence', 'machine learning', 'AI news', 'tech news', 'deep learning', 'OpenAI', 'Google AI'],
  authors: [{ name: 'AI Daily Brief' }],
  creator: 'AI Daily Brief',
  publisher: 'AI Daily Brief',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'AI Daily Brief',
    title: 'AI Daily Brief',
    description: 'AI-curated news and insights on artificial intelligence, machine learning, and tech breakthroughs.',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'AI Daily Brief',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Daily Brief',
    description: 'AI-curated news and insights on artificial intelligence, machine learning, and tech breakthroughs.',
    images: [`${SITE_URL}/og-image.png`],
  },
  alternates: {
    canonical: SITE_URL,
  },
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
