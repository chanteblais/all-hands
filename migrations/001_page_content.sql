-- 001 — the state store. One JSON string per key; the board lives in
-- `catering_kitchen_state` (+ `_test` for the scratch board). Same table
-- shape as the camp app's page_content, so cutover is a straight row copy.
-- Not destructive.

create table if not exists page_content (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
