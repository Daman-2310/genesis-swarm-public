import { redirect } from 'next/navigation'

// RETIRED 2026-06-20 — the "Clearing Matrix" was off-thesis theater (a Paillier
// homomorphic-crypto demo + escrow/proof-of-substance ring), unrelated to AIFMD II
// prospectus compliance. Redirects to the scanner.
export default function ClearingRetired() {
  redirect('/scan')
}
