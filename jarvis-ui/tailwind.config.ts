import type { Config } from 'tailwindcss'

// ── Genesis Swarm — Institutional Emerald ────────────────────────────────────
// One disciplined accent (emerald) on true slate-black, with a single cool
// secondary. Functional colours (danger / warn) are reserved for verdicts only.
// Tokens are exposed both as Tailwind colours and as CSS variables (globals.css)
// so marketing surfaces and the operator terminal share one source of truth.
const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        genesis: {
          bg: '#06070A',          // near-black slate
          surface: '#0E1014',     // raised card
          'surface-2': '#14171C', // hover / nested
          // `green` kept as the key name (used app-wide) but retuned to a
          // controlled emerald — deeper and more credible than the old neon.
          green: '#10D982',
          'green-strong': '#14F08C',
          'green-deep': '#0B9E63',
          cool: '#5B8DEF',        // the single secondary
          red: '#F2566E',         // critical / non-compliant (verdicts only)
          amber: '#F5A524',       // warning (verdicts only)
          blue: '#5B8DEF',        // alias → cool (legacy references)
          purple: '#8B7BFF',
          gold: '#E9C46A',
          text: '#E7ECEF',        // high-contrast body
          muted: '#93A1AD',       // AA-passing secondary text
          faint: '#5C6670',       // decorative / least-important only
          'border-dim': 'rgba(255,255,255,0.08)',
          'border-strong': 'rgba(255,255,255,0.14)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      animation: {
        'pulse-green': 'pulse-green 2.4s ease-in-out infinite',
        'pulse-red': 'pulse-red 1.8s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
        'dash-flow': 'dash-flow 1.5s linear infinite',
        'new-block': 'new-block 0.5s ease-out forwards',
      },
      keyframes: {
        // Tamed glow pulses — present, not blinding.
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 2px rgba(16,217,130,0.4)' },
          '50%': { boxShadow: '0 0 10px rgba(16,217,130,0.55), 0 0 22px rgba(16,217,130,0.22)' },
        },
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 2px rgba(242,86,110,0.4)' },
          '50%': { boxShadow: '0 0 10px rgba(242,86,110,0.55), 0 0 22px rgba(242,86,110,0.22)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'dash-flow': {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        'new-block': {
          '0%': { backgroundColor: 'rgba(16,217,130,0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      boxShadow: {
        // Subtle elevation scale — the "expensive" look comes from restraint.
        'glow-green': '0 0 0 1px rgba(16,217,130,0.18), 0 0 18px rgba(16,217,130,0.14)',
        'glow-red': '0 0 0 1px rgba(242,86,110,0.22), 0 0 18px rgba(242,86,110,0.16)',
        'glow-blue': '0 0 0 1px rgba(91,141,239,0.2), 0 0 18px rgba(91,141,239,0.14)',
        'glow-amber': '0 0 0 1px rgba(245,165,36,0.22), 0 0 18px rgba(245,165,36,0.14)',
      },
    },
  },
  plugins: [],
}

export default config
