import { redirect } from 'next/navigation'

// RETIRED 2026-06-14 — investor page showed fabricated AUM/traction Rebuild honestly with real figures when needed.
export default function Page() {
  redirect('/scan')
}
