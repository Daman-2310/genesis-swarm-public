'use client'
import { Printer } from 'lucide-react'

// Browser print → "Save as PDF" gives a clean, offline copy of the report with
// zero backend. No email gate: the report spreads further when it's frictionless,
// and the pilot CTA captures intent from the readers who actually matter.
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[12px] uppercase tracking-wider font-bold print:hidden"
      style={{ background: 'rgba(16,217,130,0.12)', border: '1px solid rgba(16,217,130,0.3)', color: '#10D982' }}>
      <Printer className="w-3.5 h-3.5" /> Download / print PDF
    </button>
  )
}
