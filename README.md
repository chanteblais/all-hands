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

## Cutover from the camp app (when this is deployed)

1. Deploy All Hands; smoke-test `/kitchen.html` + both API routes.
2. Copy the board state across (one row):
   `curl -s https://camp.glaum.ca/api/kitchen-list` → PUT the same JSON to
   `https://<all-hands-url>/api/kitchen-list`.
3. In the camp repo: delete `app/api/kitchen-list`, `app/api/kitchen-ai`, and
   replace `public/kitchen.html` with a signpost page pointing at the All Hands URL
   (same pattern as the retired standalone prototype). Update the camp docs'
   kitchen pointers to this repo. That closes the camp app's retire-or-gate
   thread — its only unauthenticated write endpoint and only money-spending
   endpoint both go away.
4. Optionally delete the two `catering_kitchen_state*` rows from the camp
   Supabase once the copy is verified.
