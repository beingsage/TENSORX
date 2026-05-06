import type { Metadata } from 'next'
import './globals.css'
import './App.css'



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
