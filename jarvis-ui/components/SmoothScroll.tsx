'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Lenis smooth scroll — the buttery, weightless feel of high-end sites
 * (Apple / Stripe / Ledger). Site-wide; disabled under reduced-motion.
 * Exposes a normalised scroll value on `window.__scroll` (0..1 of the first
 * viewport) so the WebGL hero can react to scroll without prop drilling.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.4 })
    let raf = 0
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)

    return () => { cancelAnimationFrame(raf); lenis.destroy() }
  }, [])
  return null
}
