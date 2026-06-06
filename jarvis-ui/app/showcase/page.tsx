"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// three.js is client-only — load the field with SSR disabled.
const SwarmField = dynamic(() => import("../../components/SwarmField"), { ssr: false });

const HEADLINE = ["Compliance", "that", "proves", "itself."];

export default function Showcase() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060a18] text-white">
      {/* WebGL agent-swarm field */}
      <SwarmField className="opacity-90" />

      {/* depth + vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.85),transparent_55%)]" />

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-cyan-200/90 backdrop-blur"
        >
          MULTI-AGENT COMPLIANCE OS · LUXEMBOURG
        </motion.span>

        <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
          {HEADLINE.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className={i === HEADLINE.length - 1
                ? "bg-gradient-to-r from-cyan-300 via-sky-400 to-amber-300 bg-clip-text text-transparent"
                : ""}
            >
              {w}{" "}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-7 max-w-2xl text-lg text-slate-300/90"
        >
          Real-time AIFMD II, DORA & MiFID II reporting — every figure traceable to its
          source, every report mapped to the exact CSSF article. Built for Conducting
          Officers who can&apos;t afford to be wrong.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="/scan"
            className="rounded-xl bg-amber-300 px-7 py-3.5 font-semibold text-slate-900 shadow-[0_8px_30px_rgba(251,191,36,0.35)] transition hover:scale-[1.03] hover:bg-amber-200"
          >
            Run a live compliance scan →
          </a>
          <a
            href="#"
            className="rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/10"
          >
            Book a 15-min demo
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium tracking-widest text-slate-400"
        >
          {["AIFMD II 2011/61/EU", "DORA 2022/2554/EU", "MiFID II", "CSSF 22/816", "ZK-AUDITED"].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              {t}
            </span>
          ))}
        </motion.div>
      </section>
    </main>
  );
}
