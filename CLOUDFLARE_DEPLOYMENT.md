# JusticeTrack — Cloudflare Workers Production Deployment

JusticeTrack ships as a TanStack Start app targeting **Cloudflare Workers**
via `@cloudflare/vite-plugin` + `wrangler`. SSR, static assets, and server
functions all run inside a single Worker — no separate Pages project, no
Vercel, no Supabase Edge Functions.

---

## 1. One-time setup

```bash
# 1. Install Wrangler and authenticate (opens browser)
bun add -d wrangler
bunx wrangler login

# 2. Verify your account
bunx wrangler whoami
```

The Worker name is `justicetrack` (see `wrangler.jsonc`). It will deploy to
`https://justicetrack.<your-subdomain>.workers.dev`.

---

## 2. Configure production secrets

Public values (URL, anon/publishable key, project id) are committed in
`wrangler.jsonc → vars` — safe to expose to the browser bundle.

Sensitive values must be added as **Worker secrets**, never as `vars`:

```bash
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
bunx wrangler secret put LOVABLE_API_KEY
```

You'll be prompted to paste each value. Find them in:
- `SUPABASE_SERVICE_ROLE_KEY` → Lovable Cloud → Backend → API Keys → `service_role`
- `LOVABLE_API_KEY` → Lovable Cloud → AI Gateway → API Keys

> Note: this project uses Lovable AI Gateway (Gemini via `LOVABLE_API_KEY`).
> A separate `GEMINI_API_KEY` is **not** required. Only add it if you swap
> the extraction backend off the Lovable gateway.

Verify:

```bash
bunx wrangler secret list
# expect: SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY
```

---

## 3. Deploy

```bash
bun run deploy           # vite build && wrangler deploy
# or for a safe rehearsal:
bun run deploy:dry-run
```

The Cloudflare Vite plugin emits the Worker bundle + static assets to
`dist/` and wires the assets binding automatically. No additional flags.

After deploy, Wrangler prints the live URL, e.g.
`https://justicetrack.<account>.workers.dev`.

---

## 4. Configure Supabase auth URLs

Once the Worker URL is live (and again for any custom domain):

1. Lovable Cloud → **Auth → URL Configuration**
2. **Site URL** → `https://justicetrack.<account>.workers.dev`
3. **Redirect URLs** → add the same URL (and any preview/custom domains)

Without this, signup confirmation and password-reset links redirect to the
Lovable preview instead of production.

---

## 5. Custom domain (optional)

```bash
# In Cloudflare dashboard: Workers & Pages → justicetrack → Settings →
# Domains & Routes → Add Custom Domain → e.g. justicetrack.karnataka.gov.in
```

DNS for the domain must be on Cloudflare. After it's live, repeat step 4
with the custom hostname.

---

## 6. Production smoke test

Run through this list against the live URL:

- [ ] `/auth` — sign up + sign in succeed; refresh keeps the session
- [ ] `/upload` — drop a PDF, redirected to `/verification/<id>`, AI fields populate
- [ ] `/verification/<id>` — Legal/Reviewing officer can verify; viewer cannot
- [ ] `/cases`, `/action-plans`, `/audit` — load real rows, no RLS errors in console
- [ ] `/users` — Super Admin can promote/demote roles
- [ ] Notifications + countdown/deadline widgets render with real data
- [ ] Sidebar navigation feels instant after first visit
- [ ] Sign out → redirect to `/auth`
- [ ] Hard-refresh on a deep route (e.g. `/verification/<id>`) — no 404, no 500

---

## 7. Operations

```bash
bunx wrangler tail                       # live request/log stream
bunx wrangler deployments list           # deploy history
bunx wrangler rollback                   # rollback to previous deploy
bunx wrangler secret list                # current secrets
bunx wrangler secret put <NAME>          # add/update a secret
bunx wrangler secret delete <NAME>       # remove a secret
```

Redeploy = re-run `bun run deploy`. Each deploy is versioned; `wrangler
rollback` reverts to the prior version atomically.

---

## 8. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| 500 on `/upload` after PDF drop | `SUPABASE_SERVICE_ROLE_KEY` or `LOVABLE_API_KEY` not set as Worker secret |
| Login works in preview but not production | Site URL / Redirect URLs in Lovable Cloud Auth not updated to the Worker URL |
| Empty dashboard / RLS errors in console | Signed-in user has no role — assign one via **Users & Roles** as Super Admin |
| `[unenv] X is not implemented` at runtime | A dependency uses Node-only APIs (e.g. `child_process`). Replace with a Worker-compatible package |
| `__dirname is not defined` | Same as above — Node CJS shim not available in Workers |
| 404 on hard-refresh of a deep route | Build didn't include the route file — re-run `bun run build` and check `src/routes/` |
| `process.env.X is undefined` in a handler | Variable not added to `wrangler.jsonc → vars` (public) or as `wrangler secret put` (private) |

---

## 9. Architecture summary

- **Runtime**: Cloudflare Workers (`nodejs_compat`, compat date `2025-09-24`)
- **SSR entry**: `src/server.ts` (wraps `@tanstack/react-start/server-entry` + branded error page)
- **Server functions**: `src/functions/*.functions.ts` via `createServerFn`
- **Server routes**: `src/routes/api/**` for raw HTTP / webhooks
- **Auth**: Supabase (`@/integrations/supabase/client` for browser, `auth-middleware` for user-scoped server fns, `client.server` admin for service-role ops)
- **Storage**: Supabase `judgments` bucket; signed URLs minted server-side with the service-role key
- **AI extraction**: Lovable AI Gateway (Gemini) called from `src/server/extract.server.ts`

No Edge Functions are deployed — everything ships with the Worker bundle.
