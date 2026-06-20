'use client'

import { useEffect, useState } from 'react'
import { rulesetHash, RULESET } from '@/lib/scan-engine'

export default function RulesetSeal() {
  const [hash, setHash] = useState<string | null>(null)
  useEffect(() => { rulesetHash().then(setHash) }, [])

  return (
    <div className="rounded-xl px-5 py-4 font-mono text-[12px]"
      style={{ background: 'rgba(16,217,130,0.05)', border: '1px solid rgba(16,217,130,0.25)' }}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[rgba(255,255,255,0.75)]">
        <span><span className="text-[#10D982]">version</span> {RULESET.version}</span>
        <span><span className="text-[#10D982]">effective</span> {RULESET.effective}</span>
        <span><span className="text-[#10D982]">framework</span> {RULESET.framework}</span>
      </div>
      <div className="mt-2 break-all text-[rgba(255,255,255,0.6)]">
        <span className="text-[#10D982]">sha-256</span> {hash ?? 'computing…'}
      </div>
    </div>
  )
}
