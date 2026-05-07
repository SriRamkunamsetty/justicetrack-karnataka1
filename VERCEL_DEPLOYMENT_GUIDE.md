# Deploying JusticeTrack to Vercel

JusticeTrack is a TanStack Start (React 19 + Vite 7) app that runs the SSR
entry on a serverless function and the static assets on the CDN. It connects
to Lovable Cloud (managed Supabase) for database, auth, storage, and the
Lovable AI Gateway for Gemini-based extraction.

---

## 1. Prerequisites

- A Vercel account with the GitHub/GitLab repo of this project linked.
- The Lovable Cloud project must already be provisioned (it is, in this repo).
- The following secrets ready to paste into Vercel:
  - `SUPABASE_SERVICE_ROLE_KEY` — Lovable Cloud → Backend → API Keys → `service_role`
  - `LOVABLE_API_KEY` — Lovable Cloud → AI Gateway → API Keys

> Public anon key, URL and project ID are already committed in `.env.example`
> and are safe to expose.

---

## 2. Vercel project settings

When importing the repo, choose:

| Setting              | Value                              |
| -------------------- | ---------------------------------- |
| Framework preset     | **Other** (TanStack Start / Vite)  |
| Build command        | `bun run build` (or `npm run build`) |
| Output directory     | `.output` (auto-detected)          |
| Install command      | `bun install` (or `npm install`)   |
| Node.js version      | 20.x                               |

TanStack Start emits a Nitro-style server bundle. Vercel's auto-detection
will create a serverless function for SSR + the static assets — leave the
"Output directory" field on its detected default if you are unsure.

---

## 3. Environment variables

Add these in **Project → Settings → Environment Variables** (apply to
*Production*, *Preview*, and *Development*):

### Public (safe to expose to the browser)
```
VITE_SUPABASE_URL              = https://gnbebcbuzrhiezoxfbxu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY  = <copy from .env.example>
VITE_SUPABASE_PROJECT_ID       = gnbebcbuzrhiezoxfbxu
```

### Server-only (NEVER prefix with `VITE_`)
```
SUPABASE_URL                = https://gnbebcbuzrhiezoxfbxu.supabase.co
SUPABASE_PUBLISHABLE_KEY    = <copy from .env.example>
SUPABASE_SERVICE_ROLE_KEY   = <paste from Lovable Cloud>
LOVABLE_API_KEY             = <paste from Lovable Cloud>
```

The complete list — with the public values pre-filled — lives in
[`.env.example`](./.env.example).

---

## 4. Auth & domain configuration

After Vercel assigns your URL (e.g. `justicetrack.vercel.app`):

1. Open Lovable Cloud → **Auth → URL Configuration**.
2. Set **Site URL** to your Vercel URL (or your custom domain).
3. Add the same URL (and any preview URLs you care about) to **Redirect URLs**.
4. If you wire up a custom domain in Vercel, repeat the above with the new
   hostname.

This is required so signup confirmation links and password-reset links
redirect back to your deployed app instead of the Lovable preview.

---

## 5. Routing on refresh

TanStack Start handles deep-link refreshes automatically — no
`vercel.json`, `_redirects`, or rewrite rules needed. If you ever see a 404
on refresh, confirm the route file exists under `src/routes/` and that the
build succeeded.

---

## 6. Post-deploy smoke test

1. Visit `/auth`, create an account, sign in.
2. Visit `/upload`, upload a small judgment PDF, verify it redirects to
   `/verification/<caseId>` and Gemini extraction populates fields.
3. Visit `/cases`, `/action-plans`, `/audit` — all should load real data.
4. Sign out from the top-right menu and confirm you are redirected to `/auth`.

---

## 7. Troubleshooting

| Symptom                                         | Likely cause / fix                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| 500 on `/upload` after PDF drop                 | `SUPABASE_SERVICE_ROLE_KEY` or `LOVABLE_API_KEY` missing in Vercel env vars         |
| Login works in Lovable but not on Vercel        | Site URL / Redirect URLs in Lovable Cloud Auth not updated to the Vercel domain     |
| Empty dashboard / RLS errors in console         | The signed-in user has no role yet — assign one in **Users & Roles** (Super Admin)  |
| `Failed to resolve module` at build time        | Run `bun install` locally and re-commit `bun.lock` so Vercel sees a clean lockfile  |
| PDF preview blank                               | Service role key missing — signed URLs cannot be generated server-side              |
| `process.env.X is undefined` in server function | The variable was added under the wrong scope — re-check Production/Preview/Dev      |

---

## 8. Notes specific to TanStack Start on Vercel

- All app server logic uses `createServerFn` (in `src/functions/*.functions.ts`)
  or server routes under `src/routes/api/`. There are no Supabase Edge
  Functions to deploy — everything ships with the Vercel build.
- Server-only secrets are read inside `.handler()` callbacks, never at module
  scope, so they never leak into the client bundle.
- Realtime (Supabase channels) works over WebSocket directly to Lovable Cloud
  and does not require any Vercel-side configuration.
