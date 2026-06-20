// RETIRED 2026-06-12. This endpoint used a third-party LLM (Groq) to compose and
// "seal" book entries — narrative judgements about named real entities. Fabricated
// adverse narrative about identifiable parties has no lawful basis and contradicts
// the "no LLM" guarantee. Removed. Use the deterministic scanner at /scan.

const GONE = {
  error: 'gone',
  message: 'Retired — LLM-composed judgements on named entities are no longer produced. Use the deterministic client-side scanner at /scan (no LLM, nothing uploaded).',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
