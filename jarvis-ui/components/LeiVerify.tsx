'use client'

import { useState } from 'react'
import { Building2, Loader2, CheckCircle2, XCircle, Globe } from 'lucide-react'

interface LeiResult {
  ok: boolean
  found?: boolean
  legalName?: string | null
  jurisdiction?: string | null
  country?: string | null
  city?: string | null
  entityStatus?: string | null
  registrationStatus?: string | null
  nextRenewal?: string | null
  error?: string
}

const ACCENT = '#4a9eff'

export default function LeiVerify() {
  const [lei, setLei] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<LeiResult | null>(null)

  async function verify() {
    const v = lei.toUpperCase().trim()
    if (!v) return
    setBusy(true); setRes(null)
    try {
      const r = await fetch(`/api/lei/${encodeURIComponent(v)}`)
      setRes(await r.json())
    } catch {
      setRes({ ok: false, error: 'Network error reaching the registry.' })
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${ACCENT}30` }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: ACCENT }}>
        <Globe className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-[0.2em] font-black">Live entity verification · GLEIF registry</span>
      </div>
      <p className="text-[11px] text-[rgba(255,255,255,0.55)] mb-3">
        The one check that does hit the real world: verify a fund&apos;s LEI against the live global registry.
        Try Deutsche Bank — <button onClick={() => setLei('7LTWFZYICNSX8D621K86')} className="underline hover:text-white font-mono">7LTWFZYICNSX8D621K86</button>
      </p>
      <div className="flex gap-2">
        <input
          value={lei}
          onChange={e => setLei(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') verify() }}
          placeholder="20-character LEI…"
          spellCheck={false}
          className="flex-1 bg-transparent text-[12px] font-mono text-white px-3 py-2 rounded outline-none"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        />
        <button onClick={verify} disabled={busy || !lei.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.15em] font-black transition-all disabled:opacity-40"
          style={{ background: ACCENT, color: '#04122a' }}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />} verify
        </button>
      </div>

      {res && (
        <div className="mt-3">
          {res.ok && res.found ? (
            <div className="rounded-lg p-3" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.25)' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
                <span className="text-[13px] font-bold text-white">{res.legalName}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[9px] uppercase tracking-wider">
                {[
                  ['entity', res.entityStatus, res.entityStatus === 'ACTIVE' ? '#00ff88' : '#ff3366'],
                  ['registration', res.registrationStatus, res.registrationStatus === 'ISSUED' ? '#00ff88' : '#ffaa00'],
                  ['country', res.country, ACCENT],
                  ['jurisdiction', res.jurisdiction, ACCENT],
                ].filter(([, v]) => v).map(([k, v, c]) => (
                  <span key={k as string} className="px-2 py-0.5 rounded" style={{ color: c as string, background: `${c}14`, border: `1px solid ${c}44` }}>
                    {k}: {v}
                  </span>
                ))}
              </div>
              {res.nextRenewal && (
                <div className="text-[9px] font-mono text-[rgba(255,255,255,0.4)] mt-2">next renewal: {new Date(res.nextRenewal).toISOString().slice(0, 10)} · verified live against gleif.org</div>
              )}
            </div>
          ) : (
            <div className="rounded-lg p-3 flex items-center gap-2" style={{ background: 'rgba(255,51,102,0.06)', border: '1px solid rgba(255,51,102,0.3)' }}>
              <XCircle className="w-4 h-4 text-[#ff3366] shrink-0" />
              <span className="text-[11px] text-[rgba(255,255,255,0.7)]">{res.error ?? 'Not found in the registry.'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
