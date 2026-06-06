// Audit Readiness Engine (#2)
//
// Turns a scan result into a board-ready compliance package: every finding is
// mapped back to the specific regulatory instrument it relates to, and each
// entry is bound into a SHA-256 hash chain so the whole pack is tamper-evident
// and re-verifiable (change any byte of any entry and the chain root changes).
//
// Honest scope: this maps engine FINDINGS to their regulatory basis — not live
// trades, which the demo does not have. The hash is SHA-256 via Web Crypto so
// it runs entirely client-side (nothing leaves the browser). A SHA3-512 variant
// would require a server round-trip or a WASM Keccak; SHA-256 keeps the
// zero-upload guarantee and uses a native, audited primitive.

import type { ScanResult } from '@/lib/scan-engine'
import { appendChain, verifyChain, type ChainLink } from '@/lib/lux-engines'
import { AIFMD_CITATIONS, RECON_CITATIONS, type Citation } from '@/lib/lux-citations'

// Each finding code → the regulatory citation that explains *why* it matters.
const CITATION_BY_CODE: Record<string, Citation> = {
  PROSPECTUS_LEVERAGE_EXCEEDS_STATUTE: AIFMD_CITATIONS.LEVERAGE_CAP,
  RETENTION_BELOW_STATUTORY_MINIMUM:   AIFMD_CITATIONS.LOAN_RETENTION_5PCT,
  STATUTORY_CONCENTRATION_BREACH:      AIFMD_CITATIONS.SINGLE_FI_CONCENTRATION_20PCT,
  OWN_CONCENTRATION_BREACH:            RECON_CITATIONS.PROSPECTUS_WEIGHT_BREACH,
  WEIGHTS_OVER_100:                    RECON_CITATIONS.WEIGHTS_DO_NOT_SUM,
}

export interface AuditEntry {
  index: number
  code: string
  title: string
  severity: 'critical' | 'warning' | 'ok'
  basis: 'own-prospectus' | 'eu-statutory'
  observed: number
  limit: number
  detail: string
  citation: Citation | null
  prevHash: string
  entryHash: string
}

export interface AuditPack {
  fundName: string | null
  structure: string
  generatedAt: string
  verdict: 'compliant' | 'non-compliant'
  criticalCount: number
  warningCount: number
  hashAlgo: string
  chainRootSha256: string
  entries: AuditEntry[]
}

export async function buildAuditPack(result: ScanResult): Promise<AuditPack> {
  const chain: ChainLink[] = []
  const entries: AuditEntry[] = []

  for (const f of result.findings) {
    const citation = CITATION_BY_CODE[f.code] ?? null
    const payload = {
      code: f.code, title: f.title, severity: f.severity, basis: f.basis,
      observed: f.observed, limit: f.limit, detail: f.detail,
      framework: citation?.framework ?? null,
    }
    const link = await appendChain(chain, payload)
    entries.push({
      index: link.index,
      code: f.code, title: f.title, severity: f.severity, basis: f.basis,
      observed: f.observed, limit: f.limit, detail: f.detail,
      citation,
      prevHash: link.prevHash,
      entryHash: link.entryHash,
    })
  }

  const chainRootSha256 = chain.length ? chain[chain.length - 1].entryHash : '0'.repeat(64)
  return {
    fundName: result.doc.fundName,
    structure: result.doc.structure.replace('_', '-'),
    generatedAt: new Date().toISOString(),
    verdict: result.compliant ? 'compliant' : 'non-compliant',
    criticalCount: result.criticalCount,
    warningCount: result.warningCount,
    hashAlgo: 'SHA-256 (Web Crypto · client-side)',
    chainRootSha256,
    entries,
  }
}

// Independently re-verify a pack's hash chain (the "certificate" check).
export async function verifyAuditPack(pack: AuditPack): Promise<{ intact: boolean; brokenAt: number | null }> {
  const chain: ChainLink[] = pack.entries.map(e => ({
    index: e.index,
    payload: {
      code: e.code, title: e.title, severity: e.severity, basis: e.basis,
      observed: e.observed, limit: e.limit, detail: e.detail,
      framework: e.citation?.framework ?? null,
    },
    prevHash: e.prevHash,
    entryHash: e.entryHash,
  }))
  return verifyChain(chain)
}
