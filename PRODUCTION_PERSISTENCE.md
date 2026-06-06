# Production Persistence — the honest next step (needs YOUR action)

The Evidence Vault and accounts are the one "realness" gap I will not pretend to
have solved blind: making the vault a **server-persisted, per-tenant, key-signed
system of record** requires your Supabase project keys and a migration applied in
your dashboard — which I can't run or verify from here. Everything below is the
exact, ready-to-apply path. None of it is live until you do these steps.

## 1. Stable signing identity (do this first — 1 command)

The Ed25519 signing route currently generates an ephemeral key per process. For a
stable signature identity across deployments, generate one and set it as an env var:

```bash
node -e "const {generateKeyPairSync}=require('crypto');const {privateKey}=generateKeyPairSync('ed25519');console.log(privateKey.export({format:'der',type:'pkcs8'}).toString('base64'))"
```

Add the output to Vercel → Project → Settings → Environment Variables as
`GENESIS_SIGNING_KEY`. Redeploy. The public key at `GET /api/sign` is now stable —
every signed vault root verifies forever against the same key.

## 2. Supabase table + RLS (apply in the Supabase SQL editor)

You set up Supabase earlier (EU/Ireland, data + auth). Run this migration:

```sql
create table if not exists evidence_records (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null,
  subject       text not null,
  verdict       text not null check (verdict in ('compliant','non-compliant','warning')),
  critical_count int not null default 0,
  warning_count  int not null default 0,
  summary       text not null,
  leaf_hash     char(64) not null,
  recorded_at   timestamptz not null default now()
);
alter table evidence_records enable row level security;
alter table evidence_records force row level security;

create policy "own records: read"   on evidence_records for select using (auth.uid() = user_id);
create policy "own records: insert" on evidence_records for insert with check (auth.uid() = user_id);

create index if not exists ix_evidence_user on evidence_records(user_id, recorded_at desc);
```

This gives every authenticated fund its **own** isolated, append-only ledger,
enforced at the database (RLS), not just the app.

## 3. API route to add (replaces localStorage as the source of truth)

`jarvis-ui/app/api/vault/route.ts` (sketch — wire to your existing
`lib/supabase` server client from the earlier auth setup):

```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase' // your existing SSR client

export const runtime = 'nodejs'

export async function GET() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data } = await sb.from('evidence_records').select('*').order('recorded_at', { ascending: false })
  return NextResponse.json({ records: data ?? [] })
}

export async function POST(req: Request) {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const { error } = await sb.from('evidence_records').insert({ ...body, user_id: user.id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

Then in `lib/vault.ts`, when a session exists, read/write through `/api/vault`
instead of `localStorage` (keep localStorage as the anonymous-demo fallback).

## 4. Login gating

`/login` already exists (Supabase auth was wired earlier in the project). Gate
`/vault` behind it so a real fund logs in and sees its persistent ledger. The
client vault becomes the "try it anonymously" mode; the server vault is the
system of record.

## Why I stopped here

I can write this code, but I cannot apply your Supabase migration, set your env
vars, or click through a real login from this environment — so I can't *verify*
it works, and shipping unverified auth/persistence is exactly the "looks done but
isn't" trap. When you've applied steps 1–2, tell me and I'll wire steps 3–4 and
we verify the login→scan→persistent-vault flow together.

## What this unlocks

This is the single change that turns "impressive demo" into "SaaS a fund can
subscribe to": a fund logs in, scans its documents, and its signed, timestamped
compliance record is **waiting for it tomorrow** — the durable, multi-tenant
audit trail that the whole "audit insurance" pitch depends on.
```

## 5. Continuous Monitoring pillar (the subscription engine)

The monitoring code is built (`lib/monitor.ts`, `/api/monitor`, `/api/cron/monitor`,
and Phase 3 of `/api/cron/morning`). To activate it:

**a) Table + RLS** — run in the Supabase SQL editor:

```sql
create table if not exists monitored_funds (
  id                   text primary key,
  user_id              uuid not null references auth.users(id) on delete cascade,
  email                text not null,
  fund_name            text,
  structure            text not null default 'unknown',
  leverage_cap_pct     numeric,
  retention_pct        numeric,
  concentration_cap_pct numeric,
  holdings             jsonb not null default '[]',
  last_verdict         text not null default 'compliant',
  last_critical_count  int not null default 0,
  active               boolean not null default true,
  last_alerted_at      timestamptz,
  created_at           timestamptz not null default now()
);
alter table monitored_funds enable row level security;
alter table monitored_funds force row level security;
create policy "own monitors: read"   on monitored_funds for select using (auth.uid() = user_id);
create policy "own monitors: insert" on monitored_funds for insert with check (auth.uid() = user_id);
create policy "own monitors: delete" on monitored_funds for delete using (auth.uid() = user_id);
create index if not exists ix_monitored_user on monitored_funds(user_id);
```
(The cron uses the service-role client, which bypasses RLS — that's intended.)

**b) Env** — `RESEND_API_KEY` (alerts; already used for magic-link) and `CRON_SECRET`
(authorizes the cron). Both in Vercel.

**c) Schedule** — it already runs **daily inside `/api/cron/morning` (Phase 3)**, so no
extra Vercel cron slot is needed (Hobby caps at 2). On Pro you can add a dedicated
`/api/cron/monitor` cron for a tighter cadence.

What it does: every active monitored fund is re-evaluated against the CURRENT
statutory rules; if a previously-compliant fund regresses (or the EU tightens a cap),
the owner gets an email. That is the "continuous monitoring" the pitch promises —
and the reason a fund pays monthly instead of running one free scan.
