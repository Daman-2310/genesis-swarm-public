// Reasoning Transparency Layer (#3)
//
// For every verdict the scan engine emits, produce a deterministic, human-
// readable "thought-trace": input → rule → test → result. There is no black box
// to explain because the engine is deterministic regex + arithmetic — so the
// trace is the *actual* computation, not a post-hoc rationalisation by an LLM.
// A human risk-manager can read it and reproduce the result by hand.

import type { ExtractedDoc, Finding, ScanResult } from '@/lib/scan-engine'

export interface TraceStep {
  n: number
  label: 'INPUT' | 'RULE' | 'TEST' | 'RESULT'
  text: string
}

export interface ReasoningTrace {
  code: string
  title: string
  severity: Finding['severity']
  basis: Finding['basis']
  reproducible: true
  steps: TraceStep[]
}

// The comparison a given check performs, inferred from the finding code so the
// TEST line reads as the literal arithmetic the engine ran.
function comparatorFor(code: string): { op: '<' | '>'; breachWord: string } {
  if (/BELOW|MINIMUM|RETENTION/.test(code)) return { op: '<', breachWord: 'below' }
  return { op: '>', breachWord: 'above' }
}

export function buildReasoningTrace(doc: ExtractedDoc, f: Finding): ReasoningTrace {
  const { op, breachWord } = comparatorFor(f.code)
  const fired = f.severity !== 'ok'
  const sourceWord = f.basis === 'own-prospectus'
    ? "the fund's own prospectus"
    : 'the document, checked against EU statute'

  const steps: TraceStep[] = [
    { n: 1, label: 'INPUT', text: `observed value = ${f.observed}% — parsed from ${sourceWord}` },
    { n: 2, label: 'RULE',  text: `${f.basis === 'eu-statutory' ? 'statutory' : 'declared'} limit = ${f.limit}% · ${f.title}` },
    { n: 3, label: 'TEST',  text: `${f.observed} ${op} ${f.limit} → ${fired ? 'TRUE' : 'FALSE'} (observed is ${fired ? breachWord : 'within'} the limit)` },
    { n: 4, label: 'RESULT', text: `${f.severity.toUpperCase()} · ${f.code}` },
  ]
  return { code: f.code, title: f.title, severity: f.severity, basis: f.basis, reproducible: true, steps }
}

export function buildReasoningTraces(result: ScanResult): ReasoningTrace[] {
  return result.findings.map(f => buildReasoningTrace(result.doc, f))
}
