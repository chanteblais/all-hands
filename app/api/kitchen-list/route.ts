import { NextRequest, NextResponse } from 'next/server'
import { getStateRaw, putStateRaw } from '@/lib/state-store'

// Ported from the camp app 2026-08-26, logic unchanged; storage now goes
// through lib/state-store.ts (Supabase in prod, file fallback in dev).
//
// Deliberately unauthenticated FOR NOW: backs the kitchen board
// (public/kitchen.html), used by a caterer with no account. The blast radius
// of an abusive write is confined to these two keys, the payload is shape- and
// size-checked, and the page is noindex + unlinked. Auth is the top open
// thread for productization — see docs/architecture.md → Auth posture.
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
