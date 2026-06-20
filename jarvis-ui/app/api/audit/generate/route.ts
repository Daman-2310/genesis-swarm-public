// RETIRED 2026-06-12. This endpoint sent the customer's tracked fund list to a
// third-party LLM (Groq) and returned a PDF labelled "CSSF-grade" (overclaim).
// No replacement — the deterministic scanner at /scan is the product.

const GONE = {
  error: 'gone',
  message: 'Retired — this endpoint sent fund data to a third-party LLM. Use the deterministic scanner at /scan.',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
