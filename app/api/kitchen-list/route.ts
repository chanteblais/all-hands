import { NextRequest, NextResponse } from 'next/server'
import { getStateRaw, putStateRaw } from '@/lib/state-store'
import { requireAccess } from '@/lib/access'

// Ported from the camp app 2026-08-26, logic unchanged; storage now goes
// through lib/state-store.ts (Supabase in prod, file fallback in dev).
//
// Gated by the shared kitchen key (lib/access.ts) since 2026-08-27 — this
// was the app's only unauthenticated write endpoint before that. The other
// containment stays: blast radius confined to two keys, shape- and
// size-checked payload, noindex + unlinked page.
// Allow-listed scopes only — `?scope=test` gives a scratch board (used to
// verify changes without touching the live one). Anything else, including no
// param, resolves to the live key; the set is closed so this can never be used
// to read or write an arbitrary row.
const KEYS: Record<string, string> = {
  live: 'catering_kitchen_state',
  test: 'catering_kitchen_state_test',
}
const keyFor = (req: NextRequest) => KEYS[req.nextUrl.searchParams.get('scope') ?? ''] ?? KEYS.live
const MAX_BYTES = 200_000

export async function GET(req: NextRequest) {
  const denied = requireAccess(req)
  if (denied) return denied

  let raw: string | null
  try {
    raw = await getStateRaw(keyFor(req))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Storage error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  let state: unknown = null
  if (raw) {
    try {
      state = JSON.parse(raw)
    } catch {
      state = null
    }
  }
  return NextResponse.json({ state })
}

export async function PUT(req: NextRequest) {
  const denied = requireAccess(req)
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // v3+ carries `days` (multi-day); v1/v2 carried a single top-level `groups`.
  // Both are accepted so a client mid-migration never gets rejected.
  const state = (body as { state?: unknown } | null)?.state as
    | { days?: unknown; groups?: unknown; pantry?: unknown }
    | undefined
  const hasMenu = Array.isArray(state?.days) || Array.isArray(state?.groups)
  if (!state || typeof state !== 'object' || !hasMenu || !Array.isArray(state.pantry)) {
    return NextResponse.json({ error: 'Unexpected shape' }, { status: 400 })
  }

  const value = JSON.stringify(state)
  if (value.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Too large' }, { status: 413 })
  }

  try {
    await putStateRaw(keyFor(req), value)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Storage error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

// sendBeacon (the page's leave-flush) can only POST — same handler.
export async function POST(req: NextRequest) {
  return PUT(req)
}
