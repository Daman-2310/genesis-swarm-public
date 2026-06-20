import { redirect } from 'next/navigation'

// RETIRED 2026-06-12. The PDF analyzer uploaded prospectus text to a third-party
// LLM (Groq) — contradicting the core guarantee ("no LLM, nothing leaves your
// browser"). Collapsed to the one defensible product: the deterministic,
// client-side scanner at /scan.
export default function Page() {
  redirect('/scan')
}
