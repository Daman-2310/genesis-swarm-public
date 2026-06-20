import { redirect } from 'next/navigation'

// RETIRED 2026-06-13 — see /security and /privacy. The "federation" page advertised
// an open aggregator that broadcasts compliance scores on named entities — a GDPR
// vector and unbuilt vaporware. It now redirects to the deterministic scanner.
export default function Page() {
  redirect('/scan')
}
