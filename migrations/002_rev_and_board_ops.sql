-- 002 — op-based writes. A revision counter on page_content backs the
-- compare-and-swap PUT (stale baseRev -> 409 -> the page rebases its pending
-- ops and retries); board_ops is an append-only record of every applied batch
-- (audit/debugging — the state blob in page_content stays the source of truth).
-- Not destructive.

alter table page_content add column if not exists rev bigint not null default 0;

create table if not exists board_ops (
  id bigserial primary key,
  board_key text not null,
  rev bigint not null,
  ops jsonb not null,
  actor text,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists board_ops_key_rev on board_ops (board_key, rev);
