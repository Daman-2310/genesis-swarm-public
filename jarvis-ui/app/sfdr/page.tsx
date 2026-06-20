import { redirect } from 'next/navigation'

// RETIRED 2026-06-14 — the SFDR disclosure generator ran on a third-party LLM (Groq)
// and the page advertised it, contradicting the no-LLM product. Redirects to /scan.
export default function Page() {
  redirect('/scan')
}
