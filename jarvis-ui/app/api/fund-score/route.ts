// RETIRED 2026-06-12. This endpoint asked an LLM (Groq) to invent a compliance
// score for a NAMED real fund ("consider any recognisable institution") —
// fabrication + defamation exposure, against the honesty brand. No replacement.

const GONE = {
  error: 'gone',
  message: 'Retired — compliance scores must come from a deterministic scan of a real document (/scan), not an LLM guessing from a fund name.',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
