# All Hands

Catering operations, from menu to pantry. Model service days — meals, groups,
headcounts, portions, buffers — and All Hands aggregates the selected days into one
shopping trip, subtracts what the pantry already holds, tracks the shop
collaboratively across devices, and closes the finished trip back into
inventory. An AI assistant takes dictated changes ("twelve and a half pounds of
black beans") and proposes edits the caterer previews and applies — it never
writes anything itself.

Extracted 2026-08-26 from the Glåüm camp app, where it ran as the "kitchen
board" during a real festival catering engagement (four service days, ~800
covers). `docs/` carries the full spec and history. 

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000/kitchen.html. With no env vars set, state lives in
`.data/` (gitignored) and the board seeds itself from a real fixture
(`data/fixtures/board-2026-08-26.json`) — zero setup. On localhost the page
defaults to a **scratch board** (`?scope=test`); `?scope=live` reaches the
"live" key.

The assistant drawer needs `ANTHROPIC_API_KEY` in `.env.local` (it spends
money); without it the rest of the board works fine.

## Production setup (one-time, owner steps)

1. **Supabase**: create a project, run `migrations/001_page_content.sql` in the
   SQL editor, put `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in
   the environment.
2. **Vercel**: import the repo, add the env vars above plus `ANTHROPIC_API_KEY`
   (production + preview).
3. ⚠️ The board is currently **unauthenticated** (see
   `docs/architecture.md` → Auth posture) — a deliberate carry-over from its
   unlisted-probe life. Treat the deployment URL as unlisted, and treat adding
   auth as the first real product milestone.

## Cutover from the camp app — completed 2026-08-27

Done against the first production deployment (URL deliberately kept out of
this public repo — treat it as unlisted, per the auth posture above):

1. Deployed to Vercel + Supabase per "Production setup"; smoke-tested
   `/kitchen.html` and both API routes.
2. Board state copied across from `camp.glaum.ca/api/kitchen-list` — both
   rows (live + test) — and GET-verified equal (v5: 6 days, 89 pantry rows;
   the live row self-migrated v5→v6 on first open, all data intact).
3. Camp side stripped completely (camp repo merge `7c3be10`):
   `app/api/kitchen-list`, `app/api/kitchen-ai`, **and** `public/kitchen.html`
   all deleted. The originally planned signpost page was dropped on Chante's
   call — the camp app must not link to this deployment in any way — so the
   old URL now 404s and the caterer gets the new URL handed to him directly.
   Camp docs' kitchen pointers now point at this repo. That closed the camp
   app's retire-or-gate thread — its only unauthenticated write endpoint and
   only money-spending endpoint both went away.
4. Still open (owner steps): delete the two `catering_kitchen_state*` rows
   from the camp Supabase, and remove `ANTHROPIC_API_KEY` from the camp
   Vercel env (this deployment has its own).
