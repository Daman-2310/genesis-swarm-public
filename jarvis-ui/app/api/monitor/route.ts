import { NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { enforceRateLimit } from '@/lib/ratelimit'

// Enable continuous monitoring on a fund for the signed-in user. Stores the
// declared metrics so the monitor cron can re-evaluate them against future
// statutory changes. RLS scopes rows to the owner.
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, { route: 'monitor', limit: 30 })
  if (limited) return limited
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'not-configured' }, { status: 501 })

  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const row = {
    id: `mon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    user_id: user.id,
    email: user.email ?? '',
    fund_name: typeof b.fundName === 'string' ? b.fundName : null,
    structure: typeof b.structure === 'string' ? b.structure : 'unknown',
    leverage_cap_pct: typeof b.leverageCapPct === 'number' ? b.leverageCapPct : null,
    retention_pct: typeof b.retentionPct === 'number' ? b.retentionPct : null,
    concentration_cap_pct: typeof b.concentrationCapPct === 'number' ? b.concentrationCapPct : null,
    holdings: Array.isArray(b.holdings) ? b.holdings : [],
    last_verdict: typeof b.verdict === 'string' ? b.verdict : 'compliant',
    last_critical_count: typeof b.criticalCount === 'number' ? b.criticalCount : 0,
    active: true,
  }

  const { error } = await sb.from('monitored_funds').insert(row)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: row.id })
}
