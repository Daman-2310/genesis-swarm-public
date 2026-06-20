'use client'

import { useEffect, useRef } from 'react'

/**
 * Cinematic flourishes for the landing hero:
 *  - a film-like load curtain that fades from black (PURE CSS via .cine-curtain
 *    in globals.css — runs even with JS disabled, auto-hidden under
 *    reduced-motion, so it can never get stuck opaque)
 *  - a soft emerald cursor glow that trails the pointer and swells over
 *    interactive elements (additive — the native cursor stays for precision)
 */
export default function CinematicFx() {
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia?.('(pointer: fine)').matches
    if (reduce || !fine) return

    const dot = dotRef.current
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, s = 1, st = 1, raf = 0
    const move = (e: MouseEvent) => { x = e.clientX; y = e.clientY }
    const over = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      st = el && el.closest('a,button,input,textarea,select,[role="button"]') ? 2.5 : 1
    }
    const loop = () => {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18; s += (st - s) * 0.2
      if (dot) dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%) scale(${s})`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', move, { passive: true })
    window.addEventListener('mouseover', over, { passive: true })
    loop()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseover', over)
    }
  }, [])

  return (
    <>
      <div aria-hidden className="cine-curtain" />
      <div ref={dotRef} aria-hidden className="hidden md:block fixed top-0 left-0 z-[95] pointer-events-none rounded-full will-change-transform"
        style={{ width: 20, height: 20, background: 'radial-gradient(circle, rgba(16,217,130,0.85) 0%, rgba(16,217,130,0) 70%)', mixBlendMode: 'screen' }} />
    </>
  )
}
