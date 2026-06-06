import { describe, it, expect } from 'vitest'
import { merkleRoot } from '@/lib/vault'
import { benchmark } from '@/lib/benchmark'

describe('vault merkle root', () => {
  it('empty tree is 64 zero hex', async () => {
    expect(await merkleRoot([])).toBe('0'.repeat(64))
  })
  it('is deterministic and 64-hex', async () => {
    const leaves = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)]
    const r1 = await merkleRoot(leaves)
    const r2 = await merkleRoot(leaves)
    expect(r1).toBe(r2)
    expect(r1).toMatch(/^[0-9a-f]{64}$/)
  })
  it('changes if any leaf changes (tamper-evident)', async () => {
    const a = await merkleRoot(['a'.repeat(64), 'b'.repeat(64)])
    const b = await merkleRoot(['a'.repeat(64), 'b'.repeat(63) + 'c'])
    expect(a).not.toBe(b)
  })
})

describe('benchmark percentiles (seed-only in node)', () => {
  it('200% leverage sits at the top of the peer distribution', () => {
    const r = benchmark({ leverage: 200 })
    expect(r.leverage?.percentile).toBe(100)
  })
  it('low leverage sits near the bottom', () => {
    const r = benchmark({ leverage: 80 })
    expect(r.leverage!.percentile).toBeLessThan(20)
  })
  it('3% retention is below the statutory-driven peer floor', () => {
    const r = benchmark({ retention: 3 })
    expect(r.retention!.percentile).toBe(0)
  })
  it('reports a non-zero sample size from the reference distribution', () => {
    expect(benchmark({ leverage: 150 }).sampleSize).toBeGreaterThan(20)
  })
})
