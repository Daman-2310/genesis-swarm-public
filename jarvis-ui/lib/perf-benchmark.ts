// Deterministic-by-design proof harness.
//
// Two honest, runnable measurements that back the "infrastructure" claims
// without inventing a number:
//   • runScanBenchmark — real throughput + latency percentiles, measured live
//     on the caller's hardware (warm-up first, then timed). No hardcoded
//     "292ns"; the page shows whatever your machine actually does.
//   • proveDeterminism — scans the same document twice and confirms the
//     canonical content hashes match. That is what "deterministic" means,
//     made checkable.

import { extractDocument, scanCompliance, SAMPLE_PROSPECTUS, type ScanResult } from '@/lib/scan-engine'
import { sha256Hex } from '@/lib/lux-engines'

export interface PerfResult {
  iterations: number
  totalMs: number
  docsPerSec: number
  meanMs: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  maxMs: number
  charsPerDoc: number
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export function runScanBenchmark(iterations = 4000, doc: string = SAMPLE_PROSPECTUS): PerfResult {
  // Warm-up so the JIT has compiled the hot path before we time it.
  for (let i = 0; i < 250; i++) scanCompliance(extractDocument(doc))

  const samples = new Float64Array(iterations)
  const t0 = now()
  for (let i = 0; i < iterations; i++) {
    const s = now()
    scanCompliance(extractDocument(doc))
    samples[i] = now() - s
  }
  const totalMs = now() - t0

  const sorted = Array.from(samples).sort((a, b) => a - b)
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]

  return {
    iterations,
    totalMs: +totalMs.toFixed(1),
    docsPerSec: Math.round(iterations / (totalMs / 1000)),
    meanMs: +(totalMs / iterations).toFixed(4),
    p50Ms: +pct(0.5).toFixed(4),
    p95Ms: +pct(0.95).toFixed(4),
    p99Ms: +pct(0.99).toFixed(4),
    maxMs: +sorted[sorted.length - 1].toFixed(4),
    charsPerDoc: doc.length,
  }
}

// Hash of the reproducible part of a scan — excludes checkedAt (a wall-clock
// timestamp) so identical input always produces an identical digest.
export async function canonicalScanHash(result: ScanResult): Promise<string> {
  const canonical = JSON.stringify({
    doc: result.doc,
    findings: result.findings,
    compliant: result.compliant,
    criticalCount: result.criticalCount,
    warningCount: result.warningCount,
  })
  return sha256Hex(canonical)
}

// Run the same document twice and confirm the canonical hashes match — a live
// demonstration that the engine is deterministic.
export async function proveDeterminism(doc: string = SAMPLE_PROSPECTUS): Promise<{
  hashA: string
  hashB: string
  identical: boolean
}> {
  const a: ScanResult = { doc: extractDocument(doc), ...scanCompliance(extractDocument(doc)) }
  const b: ScanResult = { doc: extractDocument(doc), ...scanCompliance(extractDocument(doc)) }
  const [hashA, hashB] = await Promise.all([canonicalScanHash(a), canonicalScanHash(b)])
  return { hashA, hashB, identical: hashA === hashB }
}
