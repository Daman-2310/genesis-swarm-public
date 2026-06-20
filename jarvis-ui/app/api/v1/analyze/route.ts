// RETIRED 2026-06-12. Public API wrapper for the prospectus analyzer, which sent
// uploaded text to a third-party LLM (Groq). Retired with its upstream.

const GONE = {
  error: 'gone',
  message: 'Retired — this endpoint forwarded uploaded prospectus text to a third-party LLM. There is no replacement; the scanner runs client-side at /scan.',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
