// Server-only: the actual monitoring sweep. Re-evaluates every active monitored
// fund and emails owners on regression. Shared by the standalone
// /api/cron/monitor endpoint and the consolidated morning cron (so it runs daily
// without needing a 3rd Vercel cron slot). Inert if Supabase admin is unconfigured.

import { createServiceClient, isSupabaseAdminConfigured } from '@/lib/supabase'
import { sendEmail } from '@/lib/cron'
import { reevaluate, detectChange, alertEmail, type MonitoredFund } from '@/lib/monitor'

interface Row {
  id: string; email: string; fund_name: string | null; structure: string
  leverage_cap_pct: number | null; retention_pct: number | null; concentration_cap_pct: number | null
  holdings: { name: string; weightPct: number }[] | null
  last_verdict: string; last_critical_count: number
}

function toFund(r: Row): MonitoredFund {
  return {
    id: r.id, email: r.email, fundName: r.fund_name,
    structure: (r.structure as MonitoredFund['structure']) ?? 'unknown',
    declaredLeverageCapPct: r.leverage_cap_pct, declaredRetentionPct: r.retention_pct,
    declaredConcentrationCapPct: r.concentration_cap_pct,
    holdings: Array.isArray(r.holdings) ? r.holdings : [],
    lastVerdict: (r.last_verdict as MonitoredFund['lastVerdict']) ?? 'compliant',
    lastCriticalCount: r.last_critical_count ?? 0,
  }
}

export interface SweepResult { configured: boolean; checked: number; alerted: number; error?: string }

export async function runMonitorSweep(): Promise<SweepResult> {
  if (!isSupabaseAdminConfigured()) return { configured: false, checked: 0, alerted: 0 }
  const sb = createServiceClient()
  const { data, error } = await sb.from('monitored_funds').select('*').eq('active', true)
  if (error) return { configured: true, checked: 0, alerted: 0, error: error.message }

  let checked = 0, alerted = 0
  for (const row of (data ?? []) as Row[]) {
    checked++
    const fund = toFund(row)
    const change = detectChange(fund, reevaluate(fund))
    if (change.regressed) {
      const mail = alertEmail(fund, change)
      await sendEmail(fund.email, mail.subject, mail.html, mail.text)
      alerted++
    }
    if (change.changed) {
      await sb.from('monitored_funds')
        .update({ last_verdict: change.newVerdict, last_critical_count: change.newCriticalCount, last_alerted_at: new Date().toISOString() })
        .eq('id', fund.id)
    }
  }
  return { configured: true, checked, alerted }
}
