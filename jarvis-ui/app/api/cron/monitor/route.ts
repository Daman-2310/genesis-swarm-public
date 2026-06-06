import { NextRequest, NextResponse } from 'next/server'
import { authorizeCron } from '@/lib/cron'
import { runMonitorSweep } from '@/lib/monitor-sweep'

// Standalone continuous-compliance sweep. Authorized by CRON_SECRET. Also runs
// daily inside /api/cron/morning (Phase 3) so no extra Vercel cron slot is
// needed; this endpoint is for manual / Pro-plan scheduling. Returns 501 until
// Supabase admin + the monitored_funds table are configured.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!(await authorizeCron(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const result = await runMonitorSweep()
  if (!result.configured) return NextResponse.json({ error: 'not-configured' }, { status: 501 })
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() })
}
