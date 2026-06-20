import { redirect } from 'next/navigation'

// RETIRED 2026-06-13 (council verdict) — a Wirecard fraud "replay" proved the wrong thing (detection with the answer key public); the everyday /scan sample is the honest hero demo
export default function Page() {
  redirect('/scan')
}
