// RETIRED 2026-06-12. The "Constitutional Court" sent a user-supplied entity name
// to third-party LLMs (Groq + Anthropic) to argue a prosecution and render a
// CRITICAL/CONCERNED/MONITORED/CLEARED "verdict" on that NAMED real entity. That
// is fabricated adverse content about identifiable parties with no lawful basis —
// a defamation and GDPR exposure — and it contradicts the "no LLM" guarantee.
// Removed. Use the deterministic, client-side prospectus scanner at /scan.

const GONE = {
  error: 'gone',
  message: 'Retired — this endpoint produced LLM-generated adverse "verdicts" on named entities. Use the deterministic client-side scanner at /scan (no LLM, nothing uploaded).',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
