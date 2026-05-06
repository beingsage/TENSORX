"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFloorplanStore } from '@/store/floorplanStore'
import dynamic from 'next/dynamic'

const LandingPage = dynamic(() => import('./landing/page'), { ssr: false })

export default function Home() {
  const router = useRouter()
  const setToken = useFloorplanStore((state) => state.setToken)
  const setUser = useFloorplanStore((state) => state.setUser)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      const githubAuth = url.searchParams.get('github_auth')
      const accessToken = url.searchParams.get('access_token')

      if (githubAuth && accessToken) {
        try {
          // Decode URL-safe base64
          const payloadString = atob(githubAuth)
          const payload = JSON.parse(payloadString)

          setToken(accessToken)
          setUser(payload)
          // Clear URL parameters and redirect to home
          router.replace('/home', { scroll: false })
        } catch (e) {
          console.error("Failed to parse GitHub auth payload", e)
        }
      }
    }
  }, [setToken, setUser, router])

  return <LandingPage />
}
