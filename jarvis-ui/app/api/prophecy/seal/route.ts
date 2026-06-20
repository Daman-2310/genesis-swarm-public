// RETIRED 2026-06-12. This endpoint used a third-party LLM (Groq) to generate
// "prophecies" — forward-looking risk predictions about named real entities —
// and sealed them as if they were evidence. Fabricated predictive claims about
// identifiable parties have no lawful basis and contradict the "no LLM"
// guarantee. Removed. Use the deterministic, client-side scanner at /scan.

const GONE = {
  error: 'gone',
  message: 'Retired — LLM-generated predictions about named entities are no longer produced. Use the deterministic client-side scanner at /scan (no LLM, nothing uploaded).',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
