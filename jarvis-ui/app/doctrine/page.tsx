import { redirect } from 'next/navigation'

// RETIRED 2026-06-13 — pushed an "AI replaces compliance" manifesto that contradicts the deterministic, no-LLM product
export default function Page() {
  redirect('/scan')
}
