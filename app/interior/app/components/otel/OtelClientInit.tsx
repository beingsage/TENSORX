// @ts-nocheck
'use client'

import { useEffect } from 'react'
import { initClientTelemetry } from '@/lib/otel/client'

export function OtelClientInit() {
  useEffect(() => {
    initClientTelemetry()
  }, [])

  return null
}
