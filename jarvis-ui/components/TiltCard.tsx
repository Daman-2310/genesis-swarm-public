'use client'

import { useRef, useCallback, type CSSProperties, type ReactNode } from 'react'

/**
 * Subtle 3D tilt-on-hover surface. Tracks the pointer over the element and
 * eases a small perspective rotation (CSS does the easing via .tilt-card).
 * Pointer-driven only — no rAF loop, no work at rest. Honours reduced-motion
 * (the global media query zeroes the transition) and is keyboard-inert.
 */
export default function TiltCard({
  children,
  className = '',
  style,
  max = 7,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width // 0..1
      const py = (e.clientY - r.top) / r.height
      el.style.setProperty('--ry', `${(px - 0.5) * 2 * max}deg`)
      el.style.setProperty('--rx', `${(0.5 - py) * 2 * max}deg`)
    },
    [max],
  )

  const reset = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }, [])

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`tilt-card ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
