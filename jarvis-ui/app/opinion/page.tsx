import { redirect } from 'next/navigation'

// RETIRED 2026-06-12. The opinion generator produced LLM-written legal-style memos
// (sent question + fund context to Groq). Redirects to the deterministic scanner
// at /scan.
export default function Page() {
  redirect('/scan')
}
