import { redirect } from 'next/navigation'

// RETIRED 2026-06-12. Fund-score used an LLM to fabricate a compliance score for
// a named real fund (defamation + fabrication, against the honesty brand).
// Redirects to the deterministic scanner at /scan.
export default function Page() {
  redirect('/scan')
}
