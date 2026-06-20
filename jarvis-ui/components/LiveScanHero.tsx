'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, AlertTriangle, CheckCircle2, Lock } from 'lucide-react'

// Live hero centerpiece: streams a real-shaped fund prospectus and flags the
// AIFMD II breaches as it reads, then stamps a sealed verdict. Loops. This is
// the product, shown — not described. Reduced-motion renders the final frame.

type Sev = 'ok' | 'warn' | 'crit'
interface Line { label: string; value: string; sev: Sev; note?: string }

const DOC: Line[] = [
  { label: 'FUND',          value: 'Maritime Alpha — SICAV-RAIF',      sev: 'ok' },
  { label: 'TYPE',          value: 'open-ended loan-originating AIF',  sev: 'ok' },
  { label: 'LEVERAGE',      value: 'up to 200% of NAV',               sev: 'crit', note: 'exceeds AIFMD II cap · 175%' },
  { label: 'RETENTION',     value: '5% of originated loans',          sev: 'ok' },
  { label: 'CONCENTRATION', value: 'top issuer 28% of NAV',          sev: 'crit', note: 'single-borrower cap · 20%' },
  { label: 'O-T-D',         value: 'originate-to-distribute allowed',  sev: 'warn', note: 'review · Art. 15' },
]
const COL: Record<Sev, string> = { ok: '#10D982', warn: '#F5A524', crit: '#F2566E' }
const ICON: Record<Sev, typeof CheckCircle2> = { ok: CheckCircle2, warn: AlertTriangle, crit: ShieldAlert }
const CRIT = DOC.filter(l => l.sev === 'crit').length

export default function LiveScanHero({ className = '' }: { className?: string }) {
  const [step, setStep] = useState(0)   // how many lines revealed
  const [done, setDone] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setStep(DOC.length); setDone(true); return }

    let timers: ReturnType<typeof setTimeout>[] = []
    const run = () => {
      setStep(0); setDone(false)
      DOC.forEach((_, i) => timers.push(setTimeout(() => setStep(i + 1), 600 + i * 620)))
      timers.push(setTimeout(() => setDone(true), 600 + DOC.length * 620 + 500))
      timers.push(setTimeout(() => { run() }, 600 + DOC.length * 620 + 500 + 3400))
    }
    run()
    return () => timers.forEach(clearTimeout)
  }, [])

  const pct = Math.round((step / DOC.length) * 100)

  return (
    <div className={`relative w-full ${className}`} style={{ perspective: '1400px' }}>
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(14,16,20,0.92), rgba(8,10,14,0.92))',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(16,217,130,0.06), 0 0 60px rgba(16,217,130,0.06)',
          backdropFilter: 'blur(14px)',
        }}>
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: done ? COL.crit : COL.ok, boxShadow: `0 0 8px ${done ? COL.crit : COL.ok}`, animation: 'lsh-blink 1.1s step-end infinite' }} />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: '#93A1AD' }}>
            {done ? 'verdict sealed' : 'scanning prospectus'}
          </span>
          <span className="ml-auto font-mono text-[10px] tabular-nums" style={{ color: '#5C6670' }}>AIFMD II · {pct}%</span>
        </div>

        {/* progress hairline */}
        <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COL.ok}, #5B8DEF)` }} />
        </div>

        {/* Stream */}
        <div className="p-4 space-y-1.5 font-mono text-[11px] sm:text-[12px] min-h-[232px]">
          {DOC.map((l, i) => {
            const on = i < step
            const Icon = ICON[l.sev]
            const c = COL[l.sev]
            return (
              <div key={l.label}
                className="rounded-md px-2.5 py-1.5 transition-all duration-300"
                style={{
                  opacity: on ? 1 : 0,
                  transform: on ? 'translateY(0)' : 'translateY(6px)',
                  background: on && l.sev !== 'ok' ? `${c}12` : 'transparent',
                  borderLeft: on && l.sev !== 'ok' ? `2px solid ${c}` : '2px solid transparent',
                }}>
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: on ? c : '#5C6670' }} />
                  <span className="shrink-0 w-[92px] uppercase tracking-wider" style={{ color: '#5C6670' }}>{l.label}</span>
                  <span className="truncate" style={{ color: l.sev === 'crit' ? '#FFE3E8' : '#C7CDD2' }}>{l.value}</span>
                  {i === step - 1 && !done && <span className="ml-1" style={{ color: COL.ok, animation: 'lsh-blink 1s step-end infinite' }}>▋</span>}
                </div>
                {on && l.note && (
                  <div className="pl-[116px] text-[10px] mt-0.5 uppercase tracking-wider" style={{ color: c }}>⤷ {l.note}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Verdict footer */}
        <div className="px-4 py-3 border-t flex items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.07)', background: done ? 'rgba(242,86,110,0.06)' : 'transparent', transition: 'background 0.4s' }}>
          {done ? (
            <>
              <ShieldAlert className="w-5 h-5 shrink-0" style={{ color: COL.crit }} />
              <div className="min-w-0">
                <div className="font-black text-[13px] tracking-tight" style={{ color: COL.crit }}>{CRIT} CRITICAL BREACHES</div>
                <div className="font-mono text-[9px] flex items-center gap-1.5 mt-0.5" style={{ color: '#93A1AD' }}>
                  <Lock className="w-2.5 h-2.5" /> sealed · sha-256 · in-browser · no&nbsp;LLM
                </div>
              </div>
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-1 rounded" style={{ color: COL.crit, border: `1px solid ${COL.crit}55`, background: `${COL.crit}10`, transform: 'rotate(-3deg)' }}>
                non-compliant
              </span>
            </>
          ) : (
            <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: '#5C6670' }}>
              deterministic · in-browser · nothing uploaded
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes lsh-blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.25 } }
      `}</style>
    </div>
  )
}
