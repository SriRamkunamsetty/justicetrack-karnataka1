# JusticeTrack — Cloudflare Workers Production Deployment Guide

> Official deployment reference for **JusticeTrack**, the Karnataka Government
> AI-assisted legal governance platform. This document is the single source of
> truth for taking the application from a fresh clone to a live, production
> Cloudflare Workers deployment.

---

## 1. Project Overview

**JusticeTrack** is a Karnataka Government AI governance platform built to help
legal officers, reviewing officers, department admins, and super admins manage
the full lifecycle of court judgments and the operational response that follows.

### Core workflows

1. **Upload** — Any authenticated officer uploads a judgment PDF.
2. **Extract** — The Lovable AI Gateway (Gemini) extracts case metadata, parties,
   directions, deadlines, and obligations.
3. **Verify** — Legal / Reviewing Officers review and correct AI output.
4. **Route** — The system creates `action_plans` and `workflow_assignments`
   for the responsible department.
5. **Track** — Department Admins acknowledge, execute, and report completion.
6. **Audit** — Every action is logged for governance traceability.
7. **Govern** — Super Admins manage roles, departments, and policies.

Core philosophy: **AI assists. Government officials decide.**

### Architecture overview

- **Frontend & SSR**: TanStack Start (React 19 + Vite 7), file-based routing.
- **Runtime**: Cloudflare Workers via `@cloudflare/vite-plugin` + `wrangler`.
- **Backend**: Lovable Cloud (managed Supabase) — Postgres + Auth + Storage.
- **AI**: Lovable AI Gateway (Gemini 2.5 Pro / Flash) for PDF extraction.
- **Security**: Row-Level Security (RLS) on every table, role-aware via
  `private.has_role()` SECURITY DEFINER helpers.

### Why Cloudflare?

- Single-bundle deployment (SSR + assets + server functions in one Worker).
- Global edge presence — low latency for users across Karnataka and beyond.
- Native support for the existing TanStack Start build target — no adapter swap.
- First-class secret management via `wrangler secret put`.
- Atomic, versioned deployments with one-command rollback.
- Built-in observability and `wrangler tail` log streaming.

---

## 2. Runtime Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI | React 19 + TanStack Router | File-based routing in `src/routes/` |
| Build | Vite 7 + `@cloudflare/vite-plugin` | Emits a single Worker bundle |
| SSR | TanStack Start | Entry: `src/server.ts` exporting `{ fetch }` |
| Runtime | Cloudflare Workers | `nodejs_compat`, compat date `2025-09-24` |
| Server fns | `createServerFn` | `src/functions/*.functions.ts` |
| Server routes | TanStack route handlers | `src/routes/api/**` for raw HTTP |
| Auth | Supabase Auth | Browser via anon key, server via service role |
| DB | Supabase Postgres | RLS enforced on all app tables |
| Storage | Supabase Storage | Private `judgments` bucket, signed URLs |
| AI | Lovable AI Gateway | Gemini models via `LOVABLE_API_KEY` |

### How the pieces talk

- **`wrangler.jsonc`** declares the Worker name, compat flags, and public
  `vars` (Supabase URL / anon / project id) baked into the runtime.
- **`src/server.ts`** wraps the TanStack Start server entry plus a branded
  error page and exports the `fetch` handler the Worker invokes.
- **`src/integrations/supabase/client.ts`** is the browser client (anon key).
- **`src/integrations/supabase/client.server.ts`** is the admin client
  (service-role) used **only** in server functions for storage / admin writes.
- **`src/server/extract.server.ts`** calls the Lovable AI Gateway, persists
  extracted data, and creates action plans + workflow assignments.

No Supabase Edge Functions are deployed — every server-side capability ships
inside the same Worker bundle.

---

## 3. Prerequisites

Install once on your workstation:

| Tool | Required version | Install |
|------|------------------|---------|
| Node.js | **20.x LTS or newer** | https://nodejs.org/ |
| npm | bundled with Node | `node -v && npm -v` |
| bun (optional, faster) | latest | `curl -fsSL https://bun.sh/install \| bash` |
| Wrangler CLI | latest | `npm install -g wrangler` |
| Git | any modern | https://git-scm.com/ |

You also need accounts / projects:

- **Cloudflare account** — https://dash.cloudflare.com/sign-up
- **Lovable Cloud project** (already provisioned for this repo: project ref
  `pcrdwacdnsvivjbzviwl`).
- **Lovable AI Gateway** access (provides the Gemini key under the hood —
  no separate Google AI Studio key required).

> Lovable Cloud is the managed Supabase instance for this app — you do **not**
> need to create a separate Supabase account.

---

## 4. Install Wrangler

Wrangler is Cloudflare's official CLI for building, deploying, tailing logs,
and managing secrets for Workers.

```bash
# Install Wrangler globally
npm install -g wrangler

# Authenticate (opens a browser to your Cloudflare account)
wrangler login

# Confirm the active account
wrangler whoami
```

| Command | What it does |
|---------|--------------|
| `npm install -g wrangler` | Installs the Wrangler CLI globally on your machine. |
| `wrangler login` | Opens an OAuth browser flow that links your terminal to your Cloudflare account. |
| `wrangler whoami` | Verifies which Cloudflare account is currently active. |

If you prefer not to install globally, use `npx wrangler ...` or
`bunx wrangler ...` everywhere instead.

---

## 5. Environment Variables

JusticeTrack uses two classes of variables. **Public** values are safe to ship
inside the browser bundle. **Server-only** secrets must never leave the Worker.

### 5.1 PUBLIC variables (browser-safe)

These are committed to `wrangler.jsonc → vars` and inlined into the Vite build.
They are also present in `.env.example`.

| Variable | Where to obtain | Storage | Frontend safe? |
|----------|-----------------|---------|----------------|
| `VITE_SUPABASE_URL` | Lovable Cloud → Backend → Project URL | `wrangler.jsonc` `vars` | Yes |
| `VITE_SUPABASE_PROJECT_ID` | Lovable Cloud → Backend → Project Ref | `wrangler.jsonc` `vars` | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Lovable Cloud → Backend → API Keys → `anon` | `wrangler.jsonc` `vars` | Yes |

> The publishable / `anon` key is **designed** to be exposed in browsers.
> RLS policies on every table enforce real authorization.

### 5.2 SERVER-ONLY secrets (never browser-safe)

These are stored as **Wrangler secrets**, encrypted at rest by Cloudflare, and
only accessible inside the Worker runtime via `process.env.*`.

| Variable | Where to obtain | Storage | Frontend safe? |
|----------|-----------------|---------|----------------|
| `SUPABASE_URL` | Same as `VITE_SUPABASE_URL` | `wrangler.jsonc` `vars` (mirror for server code) | Yes (URL only) |
| `SUPABASE_PUBLISHABLE_KEY` | Same anon key | `wrangler.jsonc` `vars` (mirror) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Lovable Cloud → Backend → API Keys → `service_role` | `wrangler secret put` | **No — never expose** |
| `LOVABLE_API_KEY` | Lovable Cloud → AI Gateway → API Keys | `wrangler secret put` | **No — never expose** |
| `GEMINI_API_KEY` *(optional fallback)* | Google AI Studio → API Keys (https://aistudio.google.com/apikey) | `wrangler secret put` | **No — never expose** |

> **About `GEMINI_API_KEY`:** This project routes Gemini calls through the
> Lovable AI Gateway, which already authenticates via `LOVABLE_API_KEY`. You
> only need a direct `GEMINI_API_KEY` if you swap extraction off the gateway
> to call Google's API directly. If you do, paste your actual key from the
> Google AI Studio dashboard when prompted by `wrangler secret put`.

### 5.3 Where each variable lives

```
repository
├── .env.example          ← documentation only, never commit real secrets
├── wrangler.jsonc        ← public vars (URL, anon, project id)
└── Cloudflare dashboard  ← server secrets (service role, AI keys)
    └── Worker → Settings → Variables and Secrets
```

---

## 6. Wrangler Secret Commands

Run these once per environment. Wrangler will prompt for the value — paste
your actual key from the Lovable Cloud or Google AI Studio dashboard. Values
are encrypted; they do **not** appear in `wrangler.jsonc` or git history.

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste your actual service_role key from Lovable Cloud → Backend → API Keys

wrangler secret put LOVABLE_API_KEY
# Paste your actual Lovable AI Gateway key from Lovable Cloud → AI Gateway → API Keys

# Optional — only if you bypass the Lovable AI Gateway:
wrangler secret put GEMINI_API_KEY
# Paste your actual Gemini key from https://aistudio.google.com/apikey
```

Inspect / manage existing secrets:

```bash
wrangler secret list                    # show secret names (values hidden)
wrangler secret put <NAME>              # add or rotate
wrangler secret delete <NAME>           # remove
```

**NEVER** hardcode any of the values above in source files, `.env` committed
to git, public `vars`, or React components. The frontend must only ever see
the publishable / anon key.

---

## 7. `wrangler.jsonc` Configuration

The repo ships with this configuration:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "justicetrack",
  "compatibility_date": "2025-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/server.ts",
  "observability": { "enabled": true },
  "vars": {
    "VITE_SUPABASE_URL": "https://pcrdwacdnsvivjbzviwl.supabase.co",
    "VITE_SUPABASE_PROJECT_ID": "pcrdwacdnsvivjbzviwl",
    "VITE_SUPABASE_PUBLISHABLE_KEY": "<anon key>",
    "SUPABASE_URL": "https://pcrdwacdnsvivjbzviwl.supabase.co",
    "SUPABASE_PUBLISHABLE_KEY": "<anon key>"
  }
}
```

| Field | Purpose |
|-------|---------|
| `name` | Worker name. Becomes part of the default URL: `https://justicetrack.<account>.workers.dev`. |
| `compatibility_date` | Pins the Workers runtime feature set so deploys are reproducible. |
| `compatibility_flags: ["nodejs_compat"]` | Enables Node-style built-ins (`crypto`, `Buffer`, `stream`, `path`, etc.) needed by Supabase / TanStack. |
| `main` | The Worker entry — `src/server.ts` exports the `fetch` handler. |
| `observability.enabled` | Turns on Cloudflare's request/log analytics for the Worker. |
| `vars` | Public, non-sensitive environment variables baked into the runtime and visible to the client bundle. |

**Routes / custom domains** (optional) are added via the Cloudflare dashboard
under *Workers & Pages → justicetrack → Settings → Domains & Routes* — see §9.

**Assets** are emitted automatically by `@cloudflare/vite-plugin`; no explicit
`assets` binding is needed.

---

## 8. Build & Deploy Commands

```bash
# 1. Install dependencies (one time, or after pulling new commits)
npm install
# or, faster:
bun install

# 2. Type-check + build the Worker bundle to dist/
npm run build

# 3. Deploy to Cloudflare (uploads dist/ + binds vars + secrets)
wrangler deploy

# Optional: rehearse without uploading
wrangler deploy --dry-run --outdir=dist
```

Convenience scripts in `package.json`:

| Script | Effect |
|--------|--------|
| `bun run deploy` | `vite build && wrangler deploy` |
| `bun run deploy:dry-run` | `vite build && wrangler deploy --dry-run` |
| `bun run cf:tail` | `wrangler tail` — live request/log stream |
| `bun run cf:secrets` | `wrangler secret list` |

After a successful deploy, Wrangler prints the live URL, e.g.
`https://justicetrack.<account>.workers.dev`.

### What happens during build

1. Vite compiles React + TanStack routes into the SSR Worker bundle.
2. Static assets (JS, CSS, fonts, emblem PNGs) are emitted alongside.
3. The Cloudflare plugin wires the assets binding so the Worker can serve them.
4. `wrangler deploy` uploads the bundle, attaches `vars` from `wrangler.jsonc`,
   merges in encrypted secrets, and atomically promotes the new version.

---

## 9. Supabase / Lovable Cloud Production Configuration

Once the Worker URL is live, finish the backend wiring:

### 9.1 Auth URLs

Lovable Cloud → **Auth → URL Configuration**:

- **Site URL** → `https://justicetrack.<account>.workers.dev`
- **Redirect URLs** → add the same URL **and** any preview / custom domains.

Without this, signup confirmation and password-reset links redirect to the
Lovable preview instead of production.

### 9.2 Custom domain (optional)

Cloudflare dashboard → **Workers & Pages → justicetrack → Settings → Domains
& Routes → Add Custom Domain** (e.g. `justicetrack.karnataka.gov.in`).
The domain's DNS must already be on Cloudflare. After it's live, repeat 9.1
with the new hostname.

### 9.3 RLS requirements

Every app table has Row-Level Security **enabled**. Highlights:

- `cases`: any authenticated user can `INSERT` rows where
  `auth.uid() = uploaded_by`. Only Legal / Reviewing / Super Admin can
  `UPDATE` (verify / publish).
- `action_plans`, `workflow_assignments`: department-scoped reads, role-scoped
  writes via `private.has_role()`.
- `user_roles`: only Super Admin can mutate.

If a logged-in user sees an empty dashboard, they likely have no role yet —
a Super Admin must assign one in **Users & Roles**.

### 9.4 Storage bucket

The private `judgments` bucket already exists. Uploads go to
`<user_id>/<case_id>/<filename>`. Signed URLs are minted server-side using the
service-role key — this is why `SUPABASE_SERVICE_ROLE_KEY` must be set.

---

## 10. Deployment Validation Checklist

Run through this list against the **live production URL** after every deploy:

- [ ] **Login** — `/auth` accepts existing credentials; session persists on refresh.
- [ ] **Signup** — new account, confirmation email lands, redirect URL matches production.
- [ ] **Upload PDF** — `/upload` accepts a judgment PDF, redirects to `/verification/<id>`.
- [ ] **Extraction** — AI fields populate (case number, parties, directions, deadlines).
- [ ] **Dashboard** — `/` shows real counts, no RLS errors in browser console.
- [ ] **Notifications** — bell icon shows new entries after upload / assignment.
- [ ] **RBAC** — `/users` allows Super Admin to promote/demote; non-admins get a denied state.
- [ ] **Verification workflow** — Legal/Reviewing Officer can verify; Viewer cannot.
- [ ] **Action plans** — `/action-plans` lists routed tasks; Department Admin can acknowledge.
- [ ] **Countdown engine** — deadline widgets render and tick down.
- [ ] **Audit log** — `/audit` shows every state transition.
- [ ] **Sign out** — redirects to `/auth`; session cleared.
- [ ] **Hard-refresh deep link** — `/verification/<id>` loads directly, no 404, no 500.

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| **403 Forbidden** on a table query | RLS denies the role | Sign in as Super Admin → Users & Roles → assign correct role |
| **500** on `/upload` after PDF drop | `SUPABASE_SERVICE_ROLE_KEY` or `LOVABLE_API_KEY` missing | `wrangler secret put` for the missing key, redeploy |
| `new row violates row-level security policy` | INSERT doesn't satisfy policy (`uploaded_by != auth.uid()`) | Ensure the client sets `uploaded_by` to `user.id` and not a stale value |
| **Auth redirect loops / lands on Lovable preview** | Site URL / Redirect URLs not updated | Lovable Cloud → Auth → URL Configuration → set production URL |
| **SSR 500 with HTML "Something went wrong"** | Unhandled throw in a server fn or loader | `wrangler tail` to see the stack; fix the throwing handler |
| **Hydration mismatch warning** | Server and client rendered different markup (e.g. `Date.now()` in render) | Move time-dependent values into `useEffect` or loader data |
| `process.env.X is undefined` inside a handler | Missing `var` or secret | Add to `wrangler.jsonc` (public) or `wrangler secret put` (private) and redeploy |
| `[unenv] X is not implemented yet!` | Dependency uses a Node-only API not stubbed in Workers | Replace with a Worker-compatible package |
| `__dirname is not defined` | Same root cause as above | Replace package; do not patch globals |
| **404 on hard refresh** | Route file missing or build failed | Confirm file exists in `src/routes/`, re-run `npm run build` |
| **Empty dashboard, console clean** | User has no role yet | Super Admin assigns role in Users & Roles |
| **Login works in preview, not production** | Auth URL config still points to preview | Update Site URL + Redirect URLs to the Worker URL |

Live tail of the Worker:

```bash
wrangler tail                      # all requests
wrangler tail --format=pretty      # human-readable
wrangler deployments list          # recent deploys
wrangler rollback                  # atomic rollback to previous version
```

---

## 12. Security Best Practices

- **Never expose the service-role key.** It bypasses RLS. Only set it via
  `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`. Never put it in
  `wrangler.jsonc → vars`, `.env` committed to git, React components, or
  client-imported modules.
- **Use Wrangler secrets** for every sensitive value (`SUPABASE_SERVICE_ROLE_KEY`,
  `LOVABLE_API_KEY`, optional `GEMINI_API_KEY`).
- **Server-only modules** live in `*.server.ts(x)` files (e.g.
  `client.server.ts`, `extract.server.ts`). Lovable's import protection blocks
  these from the client bundle by filename.
- **Read secrets inside `.handler()`**, not at module top-level — env injection
  happens at call time.
- **Rotate keys** if you suspect leakage: `wrangler secret put <NAME>` to
  overwrite, then redeploy. Rotate the Supabase service-role key from Lovable
  Cloud → Backend → API Keys.
- **Trust RLS, not the client.** Client gating (hide buttons by role) is UX,
  not security. Every table has RLS; every server function double-checks roles
  via `private.has_role()`.
- **Verify webhook signatures** for any future `/api/public/*` endpoints.
- **Audit log** is append-only — never disable it; it is the governance trail.

---

## 13. Production Architecture Diagram

```text
                ┌──────────────────────────┐
                │      Karnataka Gov       │
                │   Officer / Admin User   │
                └────────────┬─────────────┘
                             │ HTTPS
                             ▼
                ┌──────────────────────────┐
                │   Cloudflare Worker      │
                │  (justicetrack.*.dev)    │
                │  ─ TanStack Start SSR    │
                │  ─ Server functions      │
                │  ─ Static assets         │
                └────┬─────────┬───────────┘
                     │         │
   anon key (browser)│         │ service role (server-only)
                     ▼         ▼
        ┌────────────────────────────────────┐
        │      Lovable Cloud (Supabase)      │
        │  ┌───────────┐  ┌───────────────┐  │
        │  │   Auth    │  │   Postgres    │  │
        │  │ (JWT/RLS) │  │ + RLS policies│  │
        │  └───────────┘  └───────────────┘  │
        │  ┌───────────┐  ┌───────────────┐  │
        │  │  Storage  │  │  Realtime     │  │
        │  │ judgments │  │ notifications │  │
        │  └───────────┘  └───────────────┘  │
        └─────────────────────┬──────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │   Lovable AI Gateway     │
                │   (Gemini extraction)    │
                └────────────┬─────────────┘
                             │ structured JSON
                             ▼
                ┌──────────────────────────┐
                │   Verification Workflow  │
                │  → action_plans          │
                │  → workflow_assignments  │
                │  → notifications         │
                │  → audit_log             │
                └────────────┬─────────────┘
                             ▼
                ┌──────────────────────────┐
                │   Department Dashboard   │
                │   (countdown, status)    │
                └──────────────────────────┘
```

---

## 14. Final Production Notes

- **Scalability** — Cloudflare Workers scale to thousands of concurrent
  requests per region with zero ops. Postgres scales vertically inside
  Lovable Cloud; add read replicas if you outgrow the default tier.
- **Security** — RLS on every table, server-only secrets via Wrangler,
  service-role key never crosses the network boundary, every state change is
  audit-logged, and the AI never makes the final decision.
- **Government-grade workflows** — role hierarchy (Super Admin → Legal Officer
  → Reviewing Officer → Department Admin → Viewer), district + department
  scoping, mandatory verification before publication, immutable audit trail.
- **Real-time architecture** — Supabase Realtime channels push notifications,
  status changes, and assignment updates straight to dashboards over
  WebSockets — no polling required.
- **Explainable AI governance** — every AI-extracted field is shown alongside
  the source PDF, editable by the verifying officer, and the diff between AI
  output and final value is recorded in the audit log. Officers always have
  the last word.

JusticeTrack is now ready for a stable, secure, government-grade deployment
on Cloudflare Workers. Run `npm install && npm run build && wrangler deploy`
and ship.
