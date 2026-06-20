// RETIRED 2026-06-13. This endpoint served or generated speculative / LLM /
// fabricated assessments (risk verdicts, prophecies, scores, "agent findings")
// about NAMED real entities — or exposed an AI-plugin surface. That has no place
// in a deterministic, no-LLM compliance product and carries defamation + GDPR
// (Art. 5/6) exposure. Use the client-side scanner at /scan (nothing is uploaded).

const GONE = {
  error: 'gone',
  message: 'Retired — this surface produced or served fabricated/LLM assessments about named entities. Use the deterministic client-side scanner at /scan.',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
