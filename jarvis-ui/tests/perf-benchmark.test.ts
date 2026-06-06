import { describe, it, expect } from 'vitest'
import { runScanBenchmark, proveDeterminism, canonicalScanHash } from '@/lib/perf-benchmark'
import { extractDocument, scanCompliance, SAMPLE_PROSPECTUS, type ScanResult } from '@/lib/scan-engine'

describe('perf benchmark — real, sane measurement', () => {
  it('returns a positive throughput and ordered latency percentiles', () => {
    const r = runScanBenchmark(500)
    expect(r.iterations).toBe(500)
    expect(r.docsPerSec).toBeGreaterThan(0)
    expect(r.p50Ms).toBeLessThanOrEqual(r.p95Ms)
    expect(r.p95Ms).toBeLessThanOrEqual(r.p99Ms)
    expect(r.p99Ms).toBeLessThanOrEqual(r.maxMs)
    expect(Number.isFinite(r.meanMs)).toBe(true)
  })
})

describe('determinism — same input → same hash', () => {
  it('canonical hash is stable across runs (excludes timestamp)', async () => {
    const mk = (): ScanResult => ({ doc: extractDocument(SAMPLE_PROSPECTUS), ...scanCompliance(extractDocument(SAMPLE_PROSPECTUS)) })
    const h1 = await canonicalScanHash(mk())
    const h2 = await canonicalScanHash(mk())
    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })

  it('proveDeterminism reports identical hashes', async () => {
    const { hashA, hashB, identical } = await proveDeterminism()
    expect(identical).toBe(true)
    expect(hashA).toBe(hashB)
  })

  it('a different document yields a different hash', async () => {
    const { hashA } = await proveDeterminism(SAMPLE_PROSPECTUS)
    const other = await proveDeterminism('Equity Fund SICAV\nopen-ended\nAcme — 5%')
    expect(hashA).not.toBe(other.hashA)
  })
})
