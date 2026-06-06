import { NextResponse } from 'next/server'

// Live entity verification against the global LEI registry (GLEIF) — the
// product's first real-world data spine. Free public API, no key. Server-side
// so it works regardless of browser CORS, with a hard timeout so a slow
// registry never hangs the UI.

const LEI_RE = /^[A-Z0-9]{18}[0-9]{2}$/

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lei: string }> },
) {
  const { lei: raw } = await params
  const lei = (raw || '').toUpperCase().trim()

  if (!LEI_RE.test(lei)) {
    return NextResponse.json(
      { ok: false, error: 'Malformed LEI — expected 18 alphanumerics + 2 check digits (ISO 17442).' },
      { status: 400 },
    )
  }

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(`https://api.gleif.org/api/v1/lei-records/${lei}`, {
      headers: { Accept: 'application/vnd.api+json' },
      signal: ctrl.signal,
      // Cache live lookups briefly at the edge.
      next: { revalidate: 3600 },
    })
    clearTimeout(t)

    if (res.status === 404) {
      return NextResponse.json({ ok: false, found: false, lei, error: 'No record for this LEI in the GLEIF registry.' }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `GLEIF registry returned ${res.status}.` }, { status: 502 })
    }

    const json = await res.json()
    const a = json?.data?.attributes ?? {}
    const entity = a.entity ?? {}
    const registration = a.registration ?? {}

    return NextResponse.json({
      ok: true,
      found: true,
      lei,
      legalName: entity.legalName?.name ?? null,
      jurisdiction: entity.jurisdiction ?? null,
      legalForm: entity.legalForm?.id ?? null,
      country: entity.legalAddress?.country ?? null,
      city: entity.legalAddress?.city ?? null,
      entityStatus: entity.status ?? null,                 // ACTIVE / INACTIVE
      registrationStatus: registration.status ?? null,     // ISSUED / LAPSED / RETIRED
      lastUpdated: registration.lastUpdateDate ?? null,
      nextRenewal: registration.nextRenewalDate ?? null,
      source: 'https://www.gleif.org',
    })
  } catch (e) {
    const msg = e instanceof Error && e.name === 'AbortError' ? 'GLEIF registry timed out.' : 'Could not reach the GLEIF registry.'
    return NextResponse.json({ ok: false, error: msg }, { status: 504 })
  }
}
