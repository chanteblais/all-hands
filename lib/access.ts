import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// The kitchen key — one shared passcode gating both API routes.
//
// This closes the founding auth gap (see docs/architecture.md → Auth posture)
// at link-with-a-key strength: whoever the caterer gives the key to can use
// the board; nobody else can read state, write state, or spend Claude credit.
// It is deliberately NOT an identity system — who a caterer's crew are
// (owner + invited shoppers?) is still the open product decision, and this
// gate neither answers it nor gets in its way.
//
// The key arrives as an `x-kitchen-key` header (fetch) or a `kitchen_key`
// cookie (set by the page so sendBeacon — which cannot carry headers — stays
// authenticated). Comparison is over SHA-256 digests so timingSafeEqual gets
// equal-length buffers and no timing signal leaks, key length included.
//
// Unset key: open in local dev (same spirit as the file-backed store — a
// fresh clone just works), refused loudly in production so a deploy that
// forgot the env var fails closed instead of silently serving the old
// unauthenticated posture.

const digest = (s: string) => createHash('sha256').update(s, 'utf8').digest()

export function requireAccess(req: NextRequest): NextResponse | null {
  const expected = process.env.KITCHEN_ACCESS_KEY?.trim()
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'KITCHEN_ACCESS_KEY is not configured — refusing to serve unauthenticated in production.' },
        { status: 503 },
      )
    }
    return null
  }

  let supplied = req.headers.get('x-kitchen-key') ?? ''
  if (!supplied) {
    const cookie = req.cookies.get('kitchen_key')?.value ?? ''
    try {
      supplied = decodeURIComponent(cookie)
    } catch {
      supplied = cookie
    }
  }
  if (!supplied || !timingSafeEqual(digest(supplied), digest(expected))) {
    return NextResponse.json({ error: 'Kitchen key required' }, { status: 401 })
  }
  return null
}
