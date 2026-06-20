import { redirect } from 'next/navigation'

// RETIRED 2026-06-13 — advertised a €10,000 claim we cannot substantiate
export default function Page() {
  redirect('/scan')
}
