import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import 'maplibre-gl/dist/maplibre-gl.css'
import 'leaflet/dist/leaflet.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Collateral Workspace',
  description: 'Mongo-backed collateral valuation workspace with projects, assets, worker health, and end-to-end valuation flows.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
