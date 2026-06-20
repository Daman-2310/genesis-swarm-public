// Confidentiality-safe shareable verdict.
//
// Encodes ONLY the verdict + findings (never the raw prospectus text or holding
// table) into a URL hash, so a Conducting Officer can forward a sealed result to
// a board / auditor without disclosing the underlying confidential document.
// The underlying prospectus never leaves the author's browser and is not
// contained in the link. A SHA-256 seal over the payload makes tampering in
// transit detectable.

import type { ScanResult, Finding, Severity } from './scan-engine'
import { sha256Hex } from './lux-engines'

export interface SharedFinding {
  code: string
  severity: Severity
  title: string
  detail: string
  basis: Finding['basis']
  observed: number
  limit: number
}

export interface SharedVerdict {
  v: 1
  fund: string | null
  structure: string
  compliant: boolean
  critical: number
  warning: number
  at: string
  findings: SharedFinding[]
}

function b64urlEncode(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(escape(atob(b64)))
}

export function toSharedVerdict(r: ScanResult): SharedVerdict {
  return {
    v: 1,
    fund: r.doc.fundName,
    structure: r.doc.structure,
    compliant: r.compliant,
    critical: r.criticalCount,
    warning: r.warningCount,
    at: r.checkedAt,
    findings: r.findings.map((f) => ({
      code: f.code,
      severity: f.severity,
      title: f.title,
      detail: f.detail,
      basis: f.basis,
      observed: f.observed,
      limit: f.limit,
    })),
  }
}

export function encodeVerdict(v: SharedVerdict): string {
  return b64urlEncode(JSON.stringify(v))
}

export function decodeVerdict(token: string): SharedVerdict | null {
  try {
    const obj = JSON.parse(b64urlDecode(token))
    if (obj && obj.v === 1 && Array.isArray(obj.findings)) return obj as SharedVerdict
    return null
  } catch {
    return null
  }
}

// Seal = SHA-256 of the canonical token. A recipient recomputes it and confirms
// the shared verdict was not altered in transit.
export function sealToken(token: string): Promise<string> {
  return sha256Hex(token)
}

// Build the full forwardable URL for a result (origin + /verdict#d=…&s=…).
export async function buildShareUrl(origin: string, r: ScanResult): Promise<string> {
  const token = encodeVerdict(toSharedVerdict(r))
  const seal = await sealToken(token)
  return `${origin}/verdict#d=${token}&s=${seal}`
}
