// CONTINUOUS MONITORING — the pillar that turns a one-time scan into a
// subscription. A monitored fund's declared metrics are stored; the monitor
// re-evaluates them against the CURRENT statutory rules on a schedule and
// alerts the owner when the verdict regresses (e.g. EU tightens a cap, or a
// fund that was compliant no longer is). The re-evaluation reuses the exact
// deterministic engine /scan uses, so monitoring verdicts == scan verdicts.

import { scanCompliance, type ExtractedDoc, type ScanResult, type Finding } from '@/lib/scan-engine'

export interface MonitoredFund {
  id: string
  email: string                       // owner to alert
  fundName: string | null
  structure: 'open_ended' | 'closed_ended' | 'unknown'
  declaredLeverageCapPct: number | null
  declaredRetentionPct: number | null
  declaredConcentrationCapPct: number | null
  holdings: { name: string; weightPct: number }[]
  lastVerdict: 'compliant' | 'non-compliant' | 'warning'
  lastCriticalCount: number
}

// Re-run the deterministic engine on a monitored fund's stored metrics.
export function reevaluate(f: MonitoredFund): ScanResult {
  const doc: ExtractedDoc = {
    fundName: f.fundName,
    structure: f.structure,
    declaredLeverageCapPct: f.declaredLeverageCapPct,
    declaredRetentionPct: f.declaredRetentionPct,
    declaredConcentrationCapPct: f.declaredConcentrationCapPct,
    holdings: f.holdings,
    provenance: [],
  }
  return { doc, ...scanCompliance(doc) }
}

export interface ChangeResult {
  changed: boolean
  regressed: boolean                  // got worse — worth an alert
  newVerdict: 'compliant' | 'non-compliant' | 'warning'
  newCriticalCount: number
  reason: string
  newCriticalFindings: Finding[]
}

const verdictOf = (r: ScanResult): 'compliant' | 'non-compliant' | 'warning' =>
  r.compliant ? 'compliant' : r.criticalCount > 0 ? 'non-compliant' : 'warning'

// Compare a fund's stored verdict to a fresh re-evaluation.
export function detectChange(f: MonitoredFund, current: ScanResult): ChangeResult {
  const newVerdict = verdictOf(current)
  const rank = { compliant: 0, warning: 1, 'non-compliant': 2 } as const
  const worse = rank[newVerdict] > rank[f.lastVerdict] || current.criticalCount > f.lastCriticalCount
  const changed = newVerdict !== f.lastVerdict || current.criticalCount !== f.lastCriticalCount
  return {
    changed,
    regressed: worse,
    newVerdict,
    newCriticalCount: current.criticalCount,
    reason: worse
      ? `Compliance regressed: ${f.lastVerdict} (${f.lastCriticalCount} critical) → ${newVerdict} (${current.criticalCount} critical).`
      : changed
        ? `Status changed: ${f.lastVerdict} → ${newVerdict}.`
        : 'No change.',
    newCriticalFindings: current.findings.filter(x => x.severity === 'critical'),
  }
}

// Build the alert email for a regressed fund.
export function alertEmail(f: MonitoredFund, change: ChangeResult): { subject: string; html: string; text: string } {
  const name = f.fundName ?? 'Your monitored fund'
  const subject = `Genesis Swarm alert — ${name} is now ${change.newVerdict.toUpperCase()}`
  const findingsList = change.newCriticalFindings
    .map(x => `• ${x.title}: ${x.detail}`)
    .join('\n')
  const text =
    `${change.reason}\n\n` +
    `Fund: ${name}\nNew verdict: ${change.newVerdict} (${change.newCriticalCount} critical)\n\n` +
    `${findingsList || 'No critical findings.'}\n\n` +
    `Re-run the full scan: https://genesis-swarm-rgq5.vercel.app/scan`
  const html =
    `<p><strong>${change.reason}</strong></p>` +
    `<p>Fund: <strong>${escapeHtml(name)}</strong><br/>New verdict: <strong>${change.newVerdict}</strong> (${change.newCriticalCount} critical)</p>` +
    `<ul>${change.newCriticalFindings.map(x => `<li><strong>${escapeHtml(x.title)}:</strong> ${escapeHtml(x.detail)}</li>`).join('') || '<li>No critical findings.</li>'}</ul>` +
    `<p><a href="https://genesis-swarm-rgq5.vercel.app/scan">Re-run the full scan →</a></p>`
  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
