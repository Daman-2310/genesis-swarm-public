import { describe, it, expect } from 'vitest'
import { extractDocument, scanCompliance, fromManualEntry } from '../lib/scan-engine'

// Adversarial / fuzz inputs found nothing that crashes, hangs, ReDoS-es, or
// explodes the output. These tests lock that in: a future change must not be able
// to make the engine throw, backtrack catastrophically, or emit garbage on hostile
// input — the kind of failure that would surface in front of a real user.
const scan = (s: string) => scanCompliance(extractDocument(s))

describe('robustness — never crash on adversarial input', () => {
  const inputs: [string, string][] = [
    ['empty', ''],
    ['whitespace only', '   \n\n\t '],
    ['just a percent', '%'],
    ['10M-char filler (over the cap)', 'x'.repeat(10_000_000)],
    ['ReDoS attempt: leverage + huge gap + %', 'leverage' + ' '.repeat(300_000) + '175%'],
    ['ReDoS attempt: "5% " x 1M', '5% '.repeat(1_000_000)],
    ['unicode / emoji', '🏦 Fund 💰 leverage up to 200% 🚀'],
    ['null bytes', 'Fund\x00leverage\x00200%\x00single issuer 5%'],
    ['RTL script', 'صندوق leverage 200% عربي open-ended loan-originating'],
  ]
  for (const [name, input] of inputs) {
    it(`does not throw: ${name}`, () => {
      expect(() => scan(input)).not.toThrow()
    })
  }

  it('bounds holdings + findings on a pathological 100k-holding document', () => {
    const doc = extractDocument(
      'Global UCITS Fund\nHoldings:\n' +
        Array.from({ length: 100_000 }, (_, i) => `Co${i} — 50%`).join('\n'),
    )
    const r = scanCompliance(doc)
    expect(doc.holdings.length).toBeLessThanOrEqual(250) // holdings extraction is bounded
    expect(r.findings.length).toBeLessThan(500) // findings cannot explode to 100k (DoS guard)
  })

  it('never emits a NaN/Infinity observed value, even from hostile manual entry', () => {
    const r = scanCompliance(
      fromManualEntry({
        structure: 'open_ended',
        isUCITS: false,
        loanOriginating: true,
        declaredLeverageCapPct: NaN,
        declaredConcentrationCapPct: Infinity,
        declaredRetentionPct: -5,
        holdings: [
          { name: 'X', weightPct: NaN },
          { name: 'Y', weightPct: Infinity },
        ],
      }),
    )
    expect(r.findings.every((f) => Number.isFinite(f.observed))).toBe(true)
  })
})
