'use client'

// Free public widget: drag the AIFMD II quantitative variables and watch the
// REAL deterministic engine react in real time. It runs the exact same
// fromManualEntry → scanCompliance path the scanner uses — no separate demo
// logic, so what you see here is precisely what the engine would rule. The
// loan-originating toggle is the teaching moment: the 175/300 leverage, 5%
// retention and 20% single-borrower caps bind ONLY loan-originating AIFs.
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertOctagon, CheckCircle2, AlertTriangle, ScanLine } from 'lucide-react'
import {
  fromManualEntry, scanCompliance, STATUTORY, RULESET, type ManualEntry, type Severity,
} from '@/lib/scan-engine'

const ACCENT = '#10D982'

function Toggle({ label, options, value, onChange }: {
  label: string; options: [string, string]; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-[rgba(255,255,255,0.7)]">{label}</span>
      <div className="flex rounded-md overflow-hidden border border-[rgba(255,255,255,0.12)]">
        {options.map((opt, i) => {
          const active = (i === 1) === value
          return (
            <button key={opt} onClick={() => onChange(i === 1)}
              className="px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] font-bold transition-all"
              style={active
                ? { background: 'rgba(16,217,130,0.16)', color: ACCENT }
                : { background: 'transparent', color: 'rgba(255,255,255,0.45)' }}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Slider({ label, value, min, max, step, suffix, onChange, cap }: {
  label: string; value: number; min: number; max: number; step: number
  suffix: string; onChange: (v: number) => void; cap?: { value: number; dir: 'max' | 'min' } | null
}) {
  const breached = cap ? (cap.dir === 'max' ? value > cap.value : value < cap.value) : false
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] text-[rgba(255,255,255,0.7)]">{label}</span>
        <span className="text-[13px] font-mono font-bold" style={{ color: breached ? '#ff6b6b' : '#fff' }}>
          {value}{suffix}
          {cap && <span className="ml-2 text-[10px] font-normal text-[rgba(255,255,255,0.4)]">{cap.dir === 'max' ? '≤' : '≥'} {cap.value}{suffix}</span>}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: breached ? '#ff6b6b' : ACCENT, background: 'rgba(255,255,255,0.1)' }} />
    </div>
  )
}

const SEV_STYLE: Record<Severity, { color: string; Icon: typeof AlertOctagon }> = {
  critical: { color: '#ff6b6b', Icon: AlertOctagon },
  warning: { color: '#F5A524', Icon: AlertTriangle },
  ok: { color: ACCENT, Icon: CheckCircle2 },
}

export default function RulePlayground() {
  const [closedEnded, setClosedEnded] = useState(false)
  const [loanOrig, setLoanOrig] = useState(true)
  const [leverage, setLeverage] = useState(200)
  const [retention, setRetention] = useState(5)
  const [concentration, setConcentration] = useState(15)

  const result = useMemo(() => {
    const entry: ManualEntry = {
      fundName: 'Playground Fund',
      structure: closedEnded ? 'closed_ended' : 'open_ended',
      isUCITS: false,
      loanOriginating: loanOrig,
      declaredLeverageCapPct: leverage,
      declaredRetentionPct: retention,
      declaredConcentrationCapPct: null,
      holdings: [{ name: 'Largest single borrower', weightPct: concentration }],
    }
    return scanCompliance(fromManualEntry(entry))
  }, [closedEnded, loanOrig, leverage, retention, concentration])

  const levCap = closedEnded ? STATUTORY.LEVERAGE_CAP_CLOSED_PCT : STATUTORY.LEVERAGE_CAP_OPEN_PCT
  const verdict = result.criticalCount > 0 ? 'BREACH' : result.compliant ? 'COMPLIANT' : 'REVIEW'
  const vColor = verdict === 'BREACH' ? '#ff6b6b' : verdict === 'COMPLIANT' ? ACCENT : '#F5A524'

  return (
    <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${ACCENT}30`, backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="text-[10px] uppercase tracking-[0.2em] font-black" style={{ color: ACCENT }}>
          Rule Playground · runs the real engine
        </div>
        <div className="text-[9px] uppercase tracking-wider text-[rgba(255,255,255,0.35)]">ruleset v{RULESET.version}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
        {/* controls */}
        <div className="space-y-4">
          <Toggle label="Fund structure" options={['Open-ended', 'Closed-ended']} value={closedEnded} onChange={setClosedEnded} />
          <Toggle label="Loan-originating AIF?" options={['No', 'Yes']} value={loanOrig} onChange={setLoanOrig} />
          <Slider label="Leverage (commitment)" value={leverage} min={0} max={500} step={5} suffix="%"
            onChange={setLeverage} cap={loanOrig ? { value: levCap, dir: 'max' } : null} />
          <Slider label="Risk retention" value={retention} min={0} max={10} step={0.5} suffix="%"
            onChange={setRetention} cap={loanOrig ? { value: STATUTORY.MIN_RETENTION_PCT, dir: 'min' } : null} />
          <Slider label="Largest single-borrower exposure" value={concentration} min={0} max={50} step={1} suffix="%"
            onChange={setConcentration} cap={loanOrig ? { value: STATUTORY.SINGLE_ISSUER_CONCENTRATION_PCT, dir: 'max' } : null} />
        </div>

        {/* live verdict */}
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: `${vColor}14`, border: `1px solid ${vColor}55` }}>
            <span className="text-2xl font-black" style={{ color: vColor }}>{verdict}</span>
            <span className="text-[11px] text-[rgba(255,255,255,0.6)] leading-tight">
              {result.criticalCount} critical · {result.warningCount} warning
            </span>
          </div>

          {!loanOrig && (
            <div className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed" style={{ background: 'rgba(91,141,239,0.08)', border: '1px solid rgba(91,141,239,0.3)', color: '#9db8f5' }}>
              <b>General AIF.</b> The 175/300% leverage, 5% retention and 20% single-borrower caps <b>do not apply</b> — a non-loan-originating fund can legitimately run far higher leverage. Flip "loan-originating" on to see the statutory caps bind. <span className="text-[rgba(255,255,255,0.45)]">(This is the false-positive trap most tools fall into.)</span>
            </div>
          )}

          <div className="space-y-2">
            {result.findings.map((f, i) => {
              const s = SEV_STYLE[f.severity]
              return (
                <div key={i} className="flex items-start gap-2 text-[11px] leading-snug">
                  <s.Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: s.color }} />
                  <span className="text-[rgba(255,255,255,0.78)]">{f.title}</span>
                </div>
              )
            })}
            {result.findings.length === 0 && (
              <div className="text-[11px] text-[rgba(255,255,255,0.4)]">No findings — within every applicable limit.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between flex-wrap gap-3">
        <span className="text-[10px] text-[rgba(255,255,255,0.35)]">Deterministic · no LLM · computed in your browser · nothing uploaded</span>
        <Link href="/scan" className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.15em] font-black"
          style={{ background: 'linear-gradient(135deg, #10D982 0%, #0B9E63 100%)', color: '#04130b' }}>
          <ScanLine className="w-3.5 h-3.5" /> Scan a real prospectus
        </Link>
      </div>
    </div>
  )
}
