// Server + edge error tracking. Inert unless NEXT_PUBLIC_SENTRY_DSN is set
// (add it in Vercel to turn reporting on). No build plugin / source-map upload
// is wired here — runtime capture only — so there is no auth token to manage.
import * as Sentry from '@sentry/nextjs'

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    })
  }
}

// Captures errors thrown in App Router server components / route handlers.
export const onRequestError = Sentry.captureRequestError
