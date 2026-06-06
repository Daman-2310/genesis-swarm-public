'use client'

// ─────────────────────────────────────────────────────────────────────────────
//  Live Compliance Wall
//
//  A cinematic homepage section that runs the REAL scan engine on a real
//  prospectus, in the visitor's browser, in front of their eyes. No mockups,
//  no hardcoded verdicts: every finding, every number, and the sealed SHA-256
//  hash are computed live by the exact same deterministic pipeline that powers
//  /scan — extractDocument → scanCompliance → sealVerdict.
//
//  The point it makes in ~8 seconds, wordlessly: "this prospectus permits more
//  leverage than EU law allows, and the engine proves it — reproducibly."
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ScanLine, ShieldAlert, AlertTriangle, CheckCircle2, Lock, ArrowRight, FileText,
} from 'lucide-react'
import {
  SAMPLE_PROSPECTUS, extractDocument, scanCompliance, sealVerdict, STATUTORY,
  type Finding, type ScanResult,
} from '@/lib/scan-engine'

const HEX = '0123456789abcdef'

type Phase = 'idle' | 'extracting' | 'scanning' | 'findings' | 'sealing' | 'sealed'

const SEV_COLOR: Record<Finding['severity'], string> = {
  critical: '#ff3366',
  warning: '#ffaa00',
  ok: '#00ff88',
}

// Run the real pipeline once. Pure + synchronous for extract/scan; the seal is
// async (crypto.subtle), resolved in the component.
function runScan(): ScanResult {
  const doc = extractDocument(SAMPLE_PROSPECTUS)
  const scan = scanCompliance(doc)
  return { doc, ...scan }
}

export default function ComplianceWall({ className = '' }: { className?: string }) {
  const result = useMemo(runScan, [])
  const { doc, findings, criticalCount, warningCount, compliant } = result

  const [hash, setHash] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [revealed, setRevealed] = useState(0)         // findings shown so far
  const [sealProgress, setSealProgress] = useState(0) // 0..1 hash lock-in
  const [inView, setInView] = useState(false)

  const sectionRef = useRef<HTMLElement | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const sealInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // Seal the verdict once (real SHA-256 over the canonical result).
  useEffect(() => {
    let alive = true
    sealVerdict(result).then(h => { if (alive) setHash(h) })
    return () => { alive = false }
  }, [result])

  // Only animate while the wall is on screen — saves the main thread otherwise.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // The animation timeline. Loops while in view; fully torn down otherwise.
  useEffect(() => {
    if (!inView || !hash) return

    const clearAll = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      if (sealInterval.current) { clearInterval(sealInterval.current); sealInterval.current = null }
    }
    const at = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)) }

    const FINDING_STAGGER = 360
    const run = () => {
      clearAll()
      setRevealed(0)
      setSealProgress(0)
      setPhase('extracting')

      const SCAN_START = 700
      const SCAN_DUR = 1700
      at(SCAN_START, () => setPhase('scanning'))

      const FINDINGS_START = SCAN_START + SCAN_DUR
      at(FINDINGS_START, () => setPhase('findings'))
      findings.forEach((_, i) => at(FINDINGS_START + i * FINDING_STAGGER, () => setRevealed(i + 1)))

      const SEAL_START = FINDINGS_START + findings.length * FINDING_STAGGER + 450
      at(SEAL_START, () => {
        setPhase('sealing')
        const started = Date.now()
        const DUR = 900
        sealInterval.current = setInterval(() => {
          const p = Math.min(1, (Date.now() - started) / DUR)
          setSealProgress(p)
          if (p >= 1 && sealInterval.current) {
            clearInterval(sealInterval.current)
            sealInterval.current = null
            setPhase('sealed')
          }
        }, 40)
      })

      // Hold on the sealed verdict, then replay.
      at(SEAL_START + 900 + 5200, run)
    }

    run()
    return clearAll
  }, [inView, hash, findings])

  // Lines of the prospectus that the engine actually flags — derived from the
  // real doc + statutory constants, so the highlight never lies.
  const violation = useMemo(() => {
    const statutoryLeverage =
      doc.structure === 'closed_ended' ? STATUTORY.LEVERAGE_CAP_CLOSED_PCT : STATUTORY.LEVERAGE_CAP_OPEN_PCT
    const leverageBad = doc.declaredLeverageCapPct != null && doc.declaredLeverageCapPct > statutoryLeverage
    const retentionBad = doc.declaredRetentionPct != null && doc.declaredRetentionPct < STATUTORY.MIN_RETENTION_PCT
    const flaggedHoldings = new Set(
      doc.holdings
        .filter(h =>
          (doc.declaredConcentrationCapPct != null && h.weightPct > doc.declaredConcentrationCapPct) ||
          h.weightPct > STATUTORY.SINGLE_ISSUER_CONCENTRATION_PCT)
        .map(h => h.name),
    )
    return (line: string): 'bad' | 'data' | 'plain' => {
      if (leverageBad && /leverage/i.test(line)) return 'bad'
      if (retentionBad && /retain/i.test(line)) return 'bad'
      for (const name of flaggedHoldings) if (line.includes(name)) return 'bad'
      if (/\d\s?%/.test(line)) return 'data'
      return 'plain'
    }
  }, [doc])

  const docLines = useMemo(() => SAMPLE_PROSPECTUS.replace(/\r/g, '').split('\n'), [])
  const scanning = phase === 'scanning'
  const verdictKnown = phase === 'sealing' || phase === 'sealed'

  // Hash display: scrambles in hex, then locks left-to-right as it seals.
  const hashDisplay = useMemo(() => {
    if (!hash) return ''
    if (phase === 'sealed') return hash
    if (phase !== 'sealing') return ''
    const locked = Math.floor(hash.length * sealProgress)
    let out = ''
    for (let i = 0; i < hash.length; i++) {
      out += i < locked ? hash[i] : HEX[Math.floor(Math.random() * 16)]
    }
    return out
  }, [hash, phase, sealProgress])

  const phaseLabel: Record<Phase, string> = {
    idle: 'STANDBY',
    extracting: 'READING DOCUMENT',
    scanning: 'EXTRACTING LIMITS + HOLDINGS',
    findings: 'CHECKING AGAINST AIFMD II',
    sealing: 'SEALING VERDICT · SHA-256',
    sealed: 'SEALED · TAMPER-EVIDENT',
  }

  return (
    <section
      ref={sectionRef}
      // NB: intentionally no `data-reveal`. This section is dynamically imported
      // (ssr:false) and mounts AFTER RevealObserver has scanned for reveal
      // targets, so it would never receive `.is-visible` and would stay at the
      // base `opacity:0`. It runs its own in-view animation instead.
      className={`relative py-20 md:py-32 px-6 overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(255,86,48,0.06) 0%, transparent 60%)' }} />

      <div className="relative max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#ff5630] mb-4 font-bold">
            <ScanLine className="w-3.5 h-3.5" />
            // WATCH IT WORK — LIVE, IN YOUR BROWSER
          </div>
          <h2 className="font-black tracking-tight text-white" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            This prospectus breaks EU law.
            <br />
            <span style={{
              background: 'linear-gradient(90deg, #ff5630 0%, #ffaa00 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              The engine proves it — in milliseconds.
            </span>
          </h2>
          <p className="text-[rgba(255,255,255,0.5)] max-w-2xl mx-auto mt-6 text-base leading-relaxed">
            No LLM. No upload. Deterministic regex + arithmetic, run client-side on a real
            loan-originating AIF prospectus — then sealed into a re-verifiable SHA-256 hash.
            Every number below is computed live, right now, in your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── INPUT: the document ───────────────────────────────────────── */}
          <div className="relative rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
            }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-[rgba(255,255,255,0.5)] shrink-0" />
                <span className="text-[11px] font-mono text-[rgba(255,255,255,0.55)] truncate">
                  genesis-lux-credit-opportunities.pdf
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[rgba(255,255,255,0.35)]">INPUT</span>
            </div>

            <div className="relative px-5 py-4 font-mono text-[11px] md:text-[12px] leading-relaxed min-h-[300px]">
              {/* Scan head — sweeps once while extracting/scanning */}
              {(phase === 'extracting' || scanning) && (
                <div className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    height: 56,
                    background: 'linear-gradient(180deg, transparent, rgba(0,216,255,0.16) 45%, rgba(0,216,255,0.55) 50%, rgba(0,216,255,0.16) 55%, transparent)',
                    boxShadow: '0 0 24px rgba(0,216,255,0.4)',
                    animation: 'wall-scan 2.2s cubic-bezier(0.4,0,0.2,1) infinite',
                  }} />
              )}
              {docLines.map((line, i) => {
                const tone = violation(line)
                const color =
                  tone === 'bad' && verdictKnown ? '#ff8a73'
                  : tone === 'bad' ? 'rgba(255,255,255,0.78)'
                  : tone === 'data' ? '#7fe0ff'
                  : 'rgba(255,255,255,0.5)'
                return (
                  <div key={i} className="whitespace-pre-wrap transition-colors duration-500"
                    style={{
                      color: line.trim() === '' ? 'transparent' : color,
                      borderLeft: tone === 'bad' && verdictKnown ? '2px solid #ff5630' : '2px solid transparent',
                      paddingLeft: 8,
                      marginLeft: -8,
                      background: tone === 'bad' && verdictKnown ? 'rgba(255,86,48,0.06)' : 'transparent',
                    }}>
                    {line || ' '}
                  </div>
                )
              })}
            </div>

            {/* Extracted facts strip */}
            <div className="mt-auto grid grid-cols-3 gap-px border-t border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)]">
              {[
                { k: 'Leverage cap', v: doc.declaredLeverageCapPct != null ? `${doc.declaredLeverageCapPct}%` : '—', bad: true },
                { k: 'Retention', v: doc.declaredRetentionPct != null ? `${doc.declaredRetentionPct}%` : '—', bad: true },
                { k: 'Issuer cap', v: doc.declaredConcentrationCapPct != null ? `${doc.declaredConcentrationCapPct}%` : '—', bad: false },
              ].map(({ k, v }) => (
                <div key={k} className="px-4 py-3 bg-[#05060d] text-center">
                  <div className="text-[8px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.35)]">{k}</div>
                  <div className="font-mono font-bold text-sm mt-0.5 transition-colors duration-500"
                    style={{ color: phase === 'idle' ? 'rgba(255,255,255,0.4)' : '#7fe0ff' }}>
                    {phase === 'idle' ? '··' : v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── OUTPUT: the verdict ───────────────────────────────────────── */}
          <div className="relative rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${verdictKnown ? 'rgba(255,51,102,0.4)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: verdictKnown ? '0 0 50px rgba(255,51,102,0.1)' : 'none',
              backdropFilter: 'blur(12px)',
              transition: 'border-color 0.6s, box-shadow 0.6s',
            }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: phase === 'idle' ? '#555' : '#00d8ff',
                    boxShadow: phase === 'idle' ? 'none' : '0 0 8px #00d8ff',
                    animation: phase === 'idle' ? 'none' : 'pulse 1.2s ease-in-out infinite',
                  }} />
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[rgba(255,255,255,0.6)]">
                  {phaseLabel[phase]}
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[rgba(255,255,255,0.35)]">OUTPUT</span>
            </div>

            <div className="px-5 py-4 flex-1 min-h-[300px]">
              {/* Findings — revealed one at a time as the scan "runs" */}
              <div className="space-y-2">
                {findings.map((f, i) => {
                  const shown = i < revealed
                  const c = SEV_COLOR[f.severity]
                  const Icon = f.severity === 'critical' ? ShieldAlert : f.severity === 'warning' ? AlertTriangle : CheckCircle2
                  return (
                    <div key={f.code + i}
                      className="rounded-lg px-3 py-2.5 flex items-start gap-3"
                      style={{
                        background: `${c}0d`,
                        border: `1px solid ${c}33`,
                        opacity: shown ? 1 : 0,
                        transform: shown ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'opacity 0.45s ease, transform 0.45s ease',
                      }}>
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: c, filter: `drop-shadow(0 0 6px ${c}88)` }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-bold text-white leading-snug">{f.title}</div>
                        <div className="text-[11px] text-[rgba(255,255,255,0.5)] leading-snug mt-0.5">{f.detail}</div>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <div className="text-[12px] font-black" style={{ color: c }}>{f.observed}%</div>
                        <div className="text-[8px] uppercase tracking-wider text-[rgba(255,255,255,0.35)]">cap {f.limit}%</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Verdict banner + sealed hash */}
            <div className="border-t border-[rgba(255,255,255,0.06)] px-5 py-4"
              style={{ background: verdictKnown ? 'rgba(255,51,102,0.05)' : 'transparent', transition: 'background 0.6s' }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background: compliant ? 'rgba(0,255,136,0.12)' : 'rgba(255,51,102,0.12)',
                      border: `1px solid ${compliant ? '#00ff88' : '#ff3366'}55`,
                    }}>
                    <ShieldAlert className="w-4.5 h-4.5" style={{ color: compliant ? '#00ff88' : '#ff3366' }} />
                  </div>
                  <div>
                    <div className="font-black tracking-tight leading-none"
                      style={{ fontSize: '1.05rem', color: verdictKnown ? (compliant ? '#00ff88' : '#ff3366') : 'rgba(255,255,255,0.3)' }}>
                      {verdictKnown ? (compliant ? 'COMPLIANT' : 'NON-COMPLIANT') : 'AWAITING VERDICT'}
                    </div>
                    <div className="text-[10px] text-[rgba(255,255,255,0.45)] mt-0.5">
                      {verdictKnown
                        ? `${criticalCount} critical · ${warningCount} warning · ${findings.length} checks`
                        : 'scanning…'}
                    </div>
                  </div>
                </div>
                <a href="/scan"
                  className="group flex items-center gap-1.5 px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.12em] font-black transition-all"
                  style={{
                    background: 'rgba(255,86,48,0.12)',
                    border: '1px solid rgba(255,86,48,0.5)',
                    color: '#ff7a52',
                  }}>
                  <ScanLine className="w-3.5 h-3.5" />
                  Scan your own
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>

              {/* Sealed SHA-256 */}
              <div className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 font-mono text-[10px] md:text-[11px]"
                style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Lock className="w-3 h-3 shrink-0" style={{ color: phase === 'sealed' ? '#00ff88' : 'rgba(255,255,255,0.4)' }} />
                <span className="text-[rgba(255,255,255,0.4)] shrink-0">sha256</span>
                <span className="truncate tracking-wider"
                  style={{ color: phase === 'sealed' ? '#9fffd0' : phase === 'sealing' ? '#00d8ff' : 'rgba(255,255,255,0.25)' }}>
                  {hashDisplay || (hash ? '·'.repeat(16) : 'computing…')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-[rgba(255,255,255,0.35)] mt-6 max-w-2xl mx-auto">
          Same engine as <a href="/scan" className="text-[#ff7a52] hover:underline">/scan</a>. Paste any prospectus —
          it never leaves your device, and every verdict re-verifies against this hash.
        </p>
      </div>

      <style jsx>{`
        @keyframes wall-scan {
          0%   { top: -56px; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </section>
  )
}
