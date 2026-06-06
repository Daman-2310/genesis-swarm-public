import { NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { enforceRateLimit } from '@/lib/ratelimit'

// Server-persisted, per-tenant Evidence Vault. RLS on evidence_records scopes
// every read/write to the authenticated user — isolation enforced at the
// database, not the app. Unauthenticated callers get 401 and the client falls
// back to its anonymous localStorage vault.
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, { route: 'vault', limit: 60 })
  if (limited) return limited
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'not-configured' }, { status: 501 })
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await sb
    .from('evidence_records')
    .select('*')
    .order('recorded_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const records = (data ?? []).map(r => ({
    id: r.id, kind: r.kind, subject: r.subject, verdict: r.verdict,
    criticalCount: r.critical_count, warningCount: r.warning_count,
    summary: r.summary, leafHash: r.leaf_hash, recordedAt: r.recorded_at,
  }))
  return NextResponse.json({ records, mode: 'server' })
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, { route: 'vault', limit: 30 })
  if (limited) return limited
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'not-configured' }, { status: 501 })
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const row = {
    id: String(b.id ?? ''),
    user_id: user.id,
    kind: String(b.kind ?? 'prospectus-scan'),
    subject: String(b.subject ?? 'Unnamed fund'),
    verdict: String(b.verdict ?? 'warning'),
    critical_count: Number(b.criticalCount ?? 0),
    warning_count: Number(b.warningCount ?? 0),
    summary: String(b.summary ?? ''),
    leaf_hash: String(b.leafHash ?? ''),
    recorded_at: String(b.recordedAt ?? new Date().toISOString()),
  }
  if (!row.id || !row.leaf_hash) return NextResponse.json({ error: 'id and leafHash required' }, { status: 400 })

  const { error } = await sb.from('evidence_records').insert(row)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, mode: 'server' })
}
