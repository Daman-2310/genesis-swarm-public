// RETIRED 2026-06-12. Public API wrapper for the audit-pack generator, which sent
// fund data to a third-party LLM (Groq). Retired with its upstream.

const GONE = {
  error: 'gone',
  message: 'Retired — this endpoint sent fund data to a third-party LLM. No replacement.',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
