import { redirect } from 'next/navigation'

// RETIRED 2026-06-12. The audit-pack generator sent the customer's fund list to a
// third-party LLM (Groq) and labelled the output "CSSF-grade" (overclaim).
// Redirects to the deterministic scanner at /scan.
export default function Page() {
  redirect('/scan')
}
