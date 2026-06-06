// Resilience / fail-safe harness (#4)
//
// Institutions feed messy, hostile, real-world data. The claim we must back is
// NOT a fabricated latency number — it is that the engine FAILS SAFE: under
// malformed, oversized, conflicting, or adversarial input it returns a
// well-formed result (or a clean error) and never corrupts its output. Every
// case below is run by tests/shadow-suite.test.ts AND surfaced live on the
// Shadow Mode page, so the on-screen scorecard is the same thing CI asserts.

import { extractDocument, scanCompliance, type ScanResult } from '@/lib/scan-engine'

export interface ResilienceCase {
  id: string
  label: string
  make: () => string
}

export interface ResilienceResult {
  id: string
  label: string
  passed: boolean
  note: string
  ms: number
}

export const RESILIENCE_CASES: ResilienceCase[] = [
  { id: 'empty',        label: 'Empty input',                make: () => '' },
  { id: 'whitespace',   label: 'Whitespace / newlines only', make: () => '   \n\t  \n   ' },
  { id: 'binary',       label: 'Binary / control bytes',     make: () => Array.from({ length: 4096 }, (_, i) => String.fromCharCode(i % 256)).join('') },
  { id: 'oversized',    label: '6 MB document (cap test)',    make: () => 'Position Alpha — 12%\n'.repeat(300_000) },
  { id: 'absurd_nums',  label: 'Absurd / negative numbers',  make: () => 'maximum leverage of 999999999% — the AIFM will retain -50% — no more than 9999% per single issuer' },
  { id: 'conflicting',  label: 'Conflicting limits',         make: () => 'maximum leverage of 100% ... leverage up to 400% of NAV ... no more than 5% per single issuer ... Acme Corp — 90%' },
  { id: 'injection',    label: 'HTML / script injection',    make: () => '<script>alert(1)</script> Fund <img src=x onerror="alert(1)"> leverage up to 200% of NAV' },
  { id: 'unicode',      label: 'Unicode / RTL / emoji',      make: () => 'Fund ‮ leverage up to 2٠٠% ‬ 🦈 the AIFM will retain 3% 💰' },
]

function isWellFormed(r: ScanResult): boolean {
  return (
    r != null &&
    typeof r.criticalCount === 'number' &&
    typeof r.warningCount === 'number' &&
    typeof r.compliant === 'boolean' &&
    Array.isArray(r.findings) &&
    typeof r.checkedAt === 'string' &&
    r.findings.every(f => Number.isFinite(f.observed) && Number.isFinite(f.limit))
  )
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export function runResilienceCase(c: ResilienceCase): ResilienceResult {
  const t0 = now()
  let passed = false
  let note = ''
  try {
    const doc = extractDocument(c.make())
    const result: ScanResult = { doc, ...scanCompliance(doc) }
    if (isWellFormed(result)) {
      passed = true
      note = `safe-state · ${result.criticalCount} critical, ${result.warningCount} warning`
    } else {
      note = 'returned a malformed result'
    }
  } catch (e) {
    // A clean throw that the caller can catch is still "fail-safe" only if the
    // engine guards it; an uncaught structural break is a failure. We treat any
    // throw from the engine as a failure of the safe-state contract.
    note = 'threw: ' + (e instanceof Error ? e.message.slice(0, 80) : String(e))
  }
  return { id: c.id, label: c.label, passed, note, ms: +(now() - t0).toFixed(1) }
}

export function runResilienceScorecard(): {
  results: ResilienceResult[]
  allSafe: boolean
  passed: number
  total: number
  maxMs: number
} {
  const results = RESILIENCE_CASES.map(runResilienceCase)
  const passed = results.filter(r => r.passed).length
  return {
    results,
    allSafe: passed === results.length,
    passed,
    total: results.length,
    maxMs: results.reduce((m, r) => Math.max(m, r.ms), 0),
  }
}
