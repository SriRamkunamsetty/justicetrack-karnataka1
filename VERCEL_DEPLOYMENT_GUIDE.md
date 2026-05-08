# Deploying JusticeTrack

JusticeTrack is a TanStack Start (React 19 + Vite 7) app. The build is
pre-configured to target **Cloudflare Workers** (via `@cloudflare/vite-plugin`
and `wrangler.jsonc`). The recommended zero-config deployment paths are:

1. **Lovable Hosting** — click **Publish**. Nothing to configure. ✅ default.
2. **Cloudflare Workers / Pages** — `wrangler deploy` (build target matches).
3. **Vercel** — possible, but requires switching the SSR adapter (see §9).

It connects to Lovable Cloud (managed Supabase) for database, auth, storage,
and the Lovable AI Gateway for Gemini-based extraction.

---

## 1. Prerequisites

- A hosting account with the repo linked (Cloudflare/Vercel/etc.).
- The Lovable Cloud project must already be provisioned (it is, in this repo).
- The following secrets ready to paste into your host:
  - `SUPABASE_SERVICE_ROLE_KEY` — Lovable Cloud → Backend → API Keys → `service_role`
  - `LOVABLE_API_KEY` — Lovable Cloud → AI Gateway → API Keys

> Public anon key, URL and project ID are already committed in `.env.example`
> and are safe to expose.

---

## 2. Build settings

| Setting              | Value                                   |
| -------------------- | --------------------------------------- |
| Framework preset     | **Other** (TanStack Start / Vite)       |
| Install command      | `bun install` (or `npm install`)        |
| Build command        | `bun run build` (or `npm run build`)    |
| Node.js version      | 20.x                                    |
| Output (Cloudflare)  | Worker bundle from `wrangler.jsonc`     |
| Output (Vercel)      | See §9 — adapter switch required        |

---

## 3. Environment variables

Add these in your host's environment variable UI (apply to *Production*,
*Preview*, and *Development*). The complete pre-filled list lives in
[`.env.example`](./.env.example).

### Public (safe to expose to the browser)
```
VITE_SUPABASE_URL              = https://pcrdwacdnsvivjbzviwl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY  = <copy from .env.example>
VITE_SUPABASE_PROJECT_ID       = pcrdwacdnsvivjbzviwl
```

### Server-only (NEVER prefix with `VITE_`)
```
SUPABASE_URL                = https://pcrdwacdnsvivjbzviwl.supabase.co
SUPABASE_PUBLISHABLE_KEY    = <copy from .env.example>
SUPABASE_SERVICE_ROLE_KEY   = <paste from Lovable Cloud>
LOVABLE_API_KEY             = <paste from Lovable Cloud>
```

---

## 4. Auth & domain configuration

Once your host assigns the production URL (e.g. `justicetrack.vercel.app` or
`justicetrack.workers.dev`):

1. Open Lovable Cloud → **Auth → URL Configuration**.
2. Set **Site URL** to your production URL.
3. Add the same URL (and any preview URLs you care about) to **Redirect URLs**.
4. If you wire up a custom domain, repeat the above with the new hostname.

This is required so signup confirmation links and password-reset links
redirect back to your deployed app instead of the Lovable preview.

---

## 5. Routing on refresh

TanStack Start handles deep-link refreshes automatically — no `vercel.json`,
`_redirects`, or rewrite rules needed. If you see a 404 on refresh, confirm
the route file exists under `src/routes/` and the build succeeded.

---

## 6. Post-deploy smoke test (production checklist)

- [ ] `/auth` — sign up + sign in succeed; session persists on refresh.
- [ ] `/upload` — drop a PDF, redirected to `/verification/<id>`, AI fields populate.
- [ ] `/verification/<id>` — approve/edit/reject works for authorised roles.
- [ ] `/cases`, `/action-plans`, `/audit` — load real data, no RLS errors in console.
- [ ] `/users` — Super Admin can promote/demote roles.
- [ ] Sidebar navigation feels instant after first visit (preload + cache).
- [ ] Sign out → redirected to `/auth`.
- [ ] Hard-refresh on a deep route (e.g. `/verification/<id>`) — no 404.

---

## 7. Troubleshooting

| Symptom                                         | Likely cause / fix                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| 500 on `/upload` after PDF drop                 | `SUPABASE_SERVICE_ROLE_KEY` or `LOVABLE_API_KEY` missing in host env vars           |
| Login works in Lovable but not in production    | Site URL / Redirect URLs in Lovable Cloud Auth not updated to the production domain |
| Empty dashboard / RLS errors in console         | The signed-in user has no role yet — assign one in **Users & Roles** (Super Admin)  |
| `Failed to resolve module` at build time        | Run `bun install` locally and re-commit `bun.lock` for a clean lockfile             |
| PDF preview blank                               | Service role key missing — signed URLs cannot be generated server-side              |
| `process.env.X is undefined` in server function | The variable was added under the wrong scope — re-check Production/Preview/Dev      |
| Build succeeds but 500 at runtime on Vercel     | SSR adapter mismatch — see §9 (Cloudflare target on a Node host)                    |

---

## 8. Architecture notes

- All app server logic uses `createServerFn` (in `src/functions/*.functions.ts`)
  or server routes under `src/routes/api/`. There are no Supabase Edge
  Functions to deploy — everything ships with the SSR build.
- Server-only secrets are read inside `.handler()` callbacks, never at module
  scope, so they never leak into the client bundle.
- Realtime (Supabase channels) works over WebSocket directly to Lovable Cloud
  and does not require any host-side configuration.

---

## 9. Vercel-specific note: SSR adapter

This Lovable template targets the **Cloudflare Worker** runtime
(`@cloudflare/vite-plugin`, `wrangler.jsonc`, and `src/server.ts` exporting a
`{ fetch }` handler). A vanilla `vite build` will emit a Worker bundle —
Vercel's Node serverless functions cannot run that bundle directly.

You have three options, easiest first:

1. **Use Lovable Hosting or Cloudflare** (recommended). Click **Publish** in
   Lovable, or run `bunx wrangler deploy`. Zero config changes.
2. **Front Vercel with Cloudflare** — deploy the Worker on Cloudflare and
   point a Vercel domain/proxy at it. Keeps the existing build.
3. **Switch to a Vercel-compatible SSR adapter** — replace
   `@cloudflare/vite-plugin` with the TanStack Start Vercel preset, remove
   `wrangler.jsonc`, drop the `tanstackStart.server.entry = "server"` override
   in `vite.config.ts`, and let Vercel's auto-detection emit a Node function.
   This is a non-trivial template change; do it only if you must host on
   Vercel and cannot front-proxy from Cloudflare.

If `bun run build` succeeds locally but you get 500s on Vercel, this is the
root cause.
