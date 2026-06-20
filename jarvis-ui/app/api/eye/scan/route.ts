// RETIRED 2026-06-12. This endpoint sent a user-supplied entity name to a
// third-party LLM (Groq) and persisted a fabricated risk verdict (LOW..CRITICAL)
// about that NAMED real entity for a year. That is invented data about
// identifiable persons/firms with no lawful basis — a defamation and GDPR
// (accuracy / lawful-basis) exposure — and it contradicts the "no LLM" guarantee.
// Removed. Use the deterministic, client-side prospectus scanner at /scan.

const GONE = {
  error: 'gone',
  message: 'Retired — this endpoint generated and stored fabricated risk verdicts on named entities via a third-party LLM. Use the deterministic client-side scanner at /scan (no LLM, nothing uploaded).',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
