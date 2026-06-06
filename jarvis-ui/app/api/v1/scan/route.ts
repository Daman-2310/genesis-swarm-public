import { NextResponse } from 'next/server'
import { authenticateApiKey, checkRateLimit } from '@/lib/apikeys'
import { extractDocument, scanCompliance, sealVerdict, type ScanResult } from '@/lib/scan-engine'

// Public, API-key-authenticated compliance scan. A fund's developers POST the
// prospectus text and get back the same deterministic verdict the /scan page
// produces — integratable into their own pipelines.
//
//   curl -X POST https://.../api/v1/scan \
//        -H "Authorization: Bearer gs_live_..." \
//        -H "Content-Type: application/json" \
//        -d '{"text":"<prospectus text>"}'
export const runtime = 'nodejs'

const MAX_CHARS = 500_000

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/v1/scan',
    auth: 'Authorization: Bearer gs_live_… (scope: scan)',
    body: { text: 'string — prospectus / fact-sheet text (max 500k chars)' },
    returns: 'deterministic compliance verdict + Ed25519-sealable hash',
  })
}

export async function POST(req: Request) {
  const rec = await authenticateApiKey(req.headers.get('authorization'))
  if (!rec) {
    return NextResponse.json({ error: 'unauthorized', detail: 'Provide a valid API key: Authorization: Bearer gs_live_…' }, { status: 401 })
  }
  if (rec.scopes.length > 0 && !rec.scopes.includes('scan')) {
    return NextResponse.json({ error: 'forbidden', detail: "API key lacks the 'scan' scope." }, { status: 403 })
  }

  const rl = await checkRateLimit(rec)
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited', resetAt: rl.resetAt }, {
      status: 429,
      headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': Math.max(1, Math.floor((rl.resetAt - Date.now()) / 1000)).toString() },
    })
  }

  let body: { text?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const text = typeof body?.text === 'string' ? body.text : ''
  if (!text.trim()) return NextResponse.json({ error: 'text (non-empty string) required' }, { status: 400 })
  if (text.length > MAX_CHARS) return NextResponse.json({ error: 'text too large (max 500k chars)' }, { status: 413 })

  const doc = extractDocument(text)
  const scan = scanCompliance(doc)
  const result: ScanResult = { doc, ...scan }
  const seal = await sealVerdict(result)

  return NextResponse.json({
    fund: doc.fundName,
    structure: doc.structure,
    compliant: result.compliant,
    criticalCount: result.criticalCount,
    warningCount: result.warningCount,
    findings: result.findings,
    declared: {
      leverageCapPct: doc.declaredLeverageCapPct,
      retentionPct: doc.declaredRetentionPct,
      concentrationCapPct: doc.declaredConcentrationCapPct,
    },
    holdings: doc.holdings,
    sealSha256: seal,
    checkedAt: result.checkedAt,
  }, { headers: { 'X-RateLimit-Remaining': rl.remaining.toString() } })
}
