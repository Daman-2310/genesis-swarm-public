// RETIRED 2026-06-12. Embeddable per-entity score widgets published LLM-fabricated
// compliance scores for named real funds onto third-party sites — uncontrolled
// defamation surface. Retired with /api/fund-score.

const GONE = {
  error: 'gone',
  message: 'Retired — embeddable fund-score widgets served LLM-fabricated scores on named entities and have been removed.',
}

export async function GET() { return Response.json(GONE, { status: 410 }) }
export async function POST() { return Response.json(GONE, { status: 410 }) }
