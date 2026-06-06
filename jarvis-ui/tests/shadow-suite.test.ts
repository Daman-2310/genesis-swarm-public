import { describe, it, expect } from 'vitest'
import { extractDocument, scanCompliance, SAMPLE_PROSPECTUS, type ScanResult } from '@/lib/scan-engine'
import { buildDivergence, SHADOW_SAMPLE } from '@/lib/shadow'
import { buildReasoningTraces } from '@/lib/reasoning-trace'
import { buildAuditPack, verifyAuditPack } from '@/lib/audit-pack'
import { RESILIENCE_CASES, runResilienceCase, runResilienceScorecard } from '@/lib/resilience'

function scan(raw: string): ScanResult {
  const doc = extractDocument(raw)
  return { doc, ...scanCompliance(doc) }
}

describe('shadow mode — divergence report', () => {
  it('a self-consistent but illegal prospectus: legacy PASSES, Genesis does NOT', () => {
    const d = buildDivergence(scan(SHADOW_SAMPLE))
    expect(d.legacyVerdict).toBe('compliant')      // obeys its own declared caps
    expect(d.genesisVerdict).toBe('non-compliant') // but breaches AIFMD II statute
    expect(d.missedByLegacy.length).toBeGreaterThan(0)
    expect(d.missedByLegacy.every(f => f.basis === 'eu-statutory')).toBe(true)
    expect(d.delta).toBe(d.missedByLegacy.length)
  })

  it('classifies every critical as caught-by-both or missed-by-legacy (no double count)', () => {
    const r = scan(SAMPLE_PROSPECTUS)
    const d = buildDivergence(r)
    const criticals = r.findings.filter(f => f.severity === 'critical').length
    expect(d.caughtByBoth.length + d.missedByLegacy.length).toBe(criticals)
    expect(d.genesisCriticalCount).toBe(criticals)
  })

  it('a clean document produces zero divergence', () => {
    const d = buildDivergence(scan('Equity Fund SICAV\nopen-ended\nAcme — 5%\nBeta — 5%'))
    expect(d.genesisVerdict).toBe('compliant')
    expect(d.delta).toBe(0)
    expect(d.headline).toMatch(/No divergence/i)
  })
})

describe('reasoning trace — deterministic thought-trace', () => {
  it('emits four ordered steps (input → rule → test → result) per finding', () => {
    const traces = buildReasoningTraces(scan(SHADOW_SAMPLE))
    expect(traces.length).toBeGreaterThan(0)
    for (const t of traces) {
      expect(t.steps.map(s => s.label)).toEqual(['INPUT', 'RULE', 'TEST', 'RESULT'])
      expect(t.reproducible).toBe(true)
    }
  })

  it('the TEST line states TRUE for a fired critical', () => {
    const traces = buildReasoningTraces(scan(SHADOW_SAMPLE))
    const lev = traces.find(t => t.code === 'PROSPECTUS_LEVERAGE_EXCEEDS_STATUTE')
    expect(lev).toBeTruthy()
    expect(lev!.steps.find(s => s.label === 'TEST')!.text).toMatch(/→ TRUE/)
  })
})

describe('audit pack — citations + tamper-evident hash chain', () => {
  it('maps findings to citations and seals a re-verifiable chain', async () => {
    const pack = await buildAuditPack(scan(SHADOW_SAMPLE))
    expect(pack.entries.length).toBeGreaterThan(0)
    expect(pack.chainRootSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(pack.entries.some(e => e.citation !== null)).toBe(true)
    const { intact, brokenAt } = await verifyAuditPack(pack)
    expect(intact).toBe(true)
    expect(brokenAt).toBeNull()
  })

  it('detects tampering: altering one entry breaks the chain', async () => {
    const pack = await buildAuditPack(scan(SHADOW_SAMPLE))
    pack.entries[0].observed = pack.entries[0].observed + 1 // tamper
    const { intact } = await verifyAuditPack(pack)
    expect(intact).toBe(false)
  })
})

describe('resilience — fail-safe under adversarial input', () => {
  for (const c of RESILIENCE_CASES) {
    it(`${c.label} → safe-state`, () => {
      const r = runResilienceCase(c)
      expect(r.passed, r.note).toBe(true)
    })
  }

  it('full scorecard is all-safe', () => {
    const s = runResilienceScorecard()
    expect(s.allSafe, JSON.stringify(s.results.filter(r => !r.passed))).toBe(true)
    expect(s.passed).toBe(s.total)
  })
})
