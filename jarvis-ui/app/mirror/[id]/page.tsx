import { redirect } from 'next/navigation'

// RETIRED 2026-06-13 — see /security and /privacy.
// This page surfaced speculative or LLM-generated risk assessments, "verdicts",
// "prophecies", or scores about NAMED real entities. Publishing invented adverse
// data about identifiable parties has no lawful basis (GDPR Art. 5/6) and no place
// in a deterministic compliance product. It now redirects to the client-side, no-LLM scanner.
export default function Page() {
  redirect('/scan')
}
