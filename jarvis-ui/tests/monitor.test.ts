import { describe, it, expect } from 'vitest'
import { reevaluate, detectChange, alertEmail, type MonitoredFund } from '@/lib/monitor'

const base: MonitoredFund = {
  id: 'm1', email: 'fund@example.com', fundName: 'Helios Credit Fund',
  structure: 'open_ended',
  declaredLeverageCapPct: 200, declaredRetentionPct: 3, declaredConcentrationCapPct: 15,
  holdings: [{ name: 'Helios Energy', weightPct: 24 }],
  lastVerdict: 'compliant', lastCriticalCount: 0,
}

describe('monitor: reevaluation reuses the real engine', () => {
  it('re-scans stored metrics to the same verdict the engine gives (200% leverage = non-compliant)', () => {
    const r = reevaluate(base)
    expect(r.compliant).toBe(false)
    expect(r.criticalCount).toBeGreaterThanOrEqual(1)
    expect(r.findings.some(f => f.code === 'PROSPECTUS_LEVERAGE_EXCEEDS_STATUTE')).toBe(true)
  })
})

describe('monitor: change detection', () => {
  it('flags a regression when stored verdict was compliant but reeval is non-compliant', () => {
    const change = detectChange(base, reevaluate(base))
    expect(change.changed).toBe(true)
    expect(change.regressed).toBe(true)
    expect(change.newVerdict).toBe('non-compliant')
  })

  it('does NOT flag a change when stored state already matches reeval', () => {
    const current = reevaluate(base)
    const synced: MonitoredFund = { ...base, lastVerdict: 'non-compliant', lastCriticalCount: current.criticalCount }
    const change = detectChange(synced, current)
    expect(change.changed).toBe(false)
    expect(change.regressed).toBe(false)
  })
})

describe('monitor: alert email', () => {
  it('builds an alert naming the fund and listing critical findings', () => {
    const change = detectChange(base, reevaluate(base))
    const mail = alertEmail(base, change)
    expect(mail.subject).toContain('Helios Credit Fund')
    expect(mail.subject).toContain('NON-COMPLIANT')
    expect(mail.text).toContain('Re-run the full scan')
    expect(mail.html).toContain('<li>')
  })
})
