import { redirect } from 'next/navigation'

// RETIRED 2026-06-12. Per-entity fund pages rendered LLM-fabricated compliance
// scores for named real funds. Redirects to the deterministic scanner at /scan.
export default function Page() {
  redirect('/scan')
}
