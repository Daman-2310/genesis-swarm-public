# Genesis Swarm — jarvis-ui

Deterministic AIFMD II / UCITS compliance tooling for European funds.
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind. Deployed on Vercel
(`genesis-swarm.vercel.app`). The core product is a **client-side, no-LLM**
prospectus scanner. Brand rule: **honesty over hype — never fabricate metrics,
AUM, customer counts, or uptime.**

## Build Commands
- `npm run dev` — local dev on port 3000
- `npm run build` — production build (this is what Vercel runs; the real deploy gate)
- `npm run start` — serve the production build

## Lint Commands
- `npm run type-check` — `tsc --noEmit` (run before every commit)
- `npm run lint` — `next lint`

## Test Commands
- `npm run test` — `vitest run`
- `npm run test:watch` — vitest watch mode
- `npm run test:coverage` — coverage report

## Architecture
- **Scan engine** (`lib/scan-engine.ts`): regex extraction + arithmetic, **no LLM
  in the decision path**; verdicts are SHA-256 sealed and reproducible. Checks
  AIFMD II (leverage 175/300%, retention 5%, single-issuer 20%) + UCITS (10%
  single-issuer cap, 5/10/40 bucket — auto-gated on `isUCITS` detection).
- **Design system** "Institutional Emerald": one emerald accent `#10D982` + one
  cool secondary `#5B8DEF` on slate-black; semantic red/amber reserved for
  verdicts only. Tokens in `tailwind.config.ts`, CSS vars in `app/globals.css`,
  self-hosted Geist via the `geist` package.
- **Deploy**: monorepo root is `../` (genesis-swarm); Vercel auto-deploys `main`.
  Push `main` → production. Service worker `public/sw.js` (cache `genesis-v2`) is
  **network-first** for shell pages.

## Conventions
- Verify by driving the real app (Playwright under `/tmp/gw-pw`), not only units.
- Compliance output must carry "information only, not legal advice".

### Lessons Learned
- **2026-06-11 · Stale prod UI:** the service worker served `/` stale-first
  (stale-while-revalidate), so returning visitors saw the *previous* deploy.
  Fix: network-first for shell pages + bump `CACHE` (`genesis-v1`→`v2`) so the
  old cache is purged on activate. Symptom: "everything looks the same after deploy."
- **2026-06-11 · Repo-wide color codemod:** literal-string swaps are safe, but
  first scan `linear-gradient` lines for a green+red stop pair (only the court
  page had one) to avoid an ugly green→red gradient.
- **2026-06-11 · No ffmpeg/brew on host:** `npm i ffmpeg-static` ships a prebuilt
  h264 ffmpeg — encode Playwright PNG frames → mp4 (crisp, LinkedIn-native). GIF
  via `gifenc` is the 256-color fallback (bands on dark gradients).
- **2026-06-11 · MCP servers load only at session start:** adding one to
  `~/.claude.json` mid-session won't surface its tools until Claude Code reloads.
