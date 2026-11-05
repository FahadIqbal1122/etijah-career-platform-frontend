'use client'

import { useEffect } from 'react'
import { captureAttribution } from '@/lib/attribution'

// Renders nothing: records the ad parameters (utm_*, gclid) from the landing URL.
export default function AttributionCapture() {
  useEffect(() => { captureAttribution() }, [])
  return null
}
