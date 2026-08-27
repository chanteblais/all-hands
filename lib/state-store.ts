import fs from 'fs'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabase'

// The one storage seam. Board state is a JSON string per key in the
// `page_content` table (migrations/001) — the same shape the camp app used, so
// cutover is a straight copy of the row. When the Supabase env vars are absent
// (local dev, a fresh clone) the store falls back to files under .data/,
// seeding a key's first read from data/fixtures/ so `npm run dev` shows a real
// board with zero setup. Production must have Supabase configured — the file
// fallback is refused there so a misconfigured deploy fails loudly instead of
// writing state into an ephemeral serverless filesystem.

const hasSupabase = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

const DATA_DIR = path.join(process.cwd(), '.data')
const FIXTURE = path.join(process.cwd(), 'data', 'fixtures', 'board-2026-08-26.json')

function filePath(key: string) {
  return path.join(DATA_DIR, key + '.json')
}

function assertFileStoreAllowed() {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    throw new Error('Supabase env vars missing in production — refusing file-store fallback')
  }
}

/** Raw JSON string for a key, or null. */
export async function getStateRaw(key: string): Promise<string | null> {
  if (hasSupabase()) {
    const { data, error } = await supabaseAdmin
      .from('page_content')
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data?.value ?? null
  }
  assertFileStoreAllowed()
  const p = filePath(key)
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8')
  // First read of the live key on a fresh clone: seed from the fixture. The
  // scratch key (`*_test`) starts empty on purpose — that is what it is for.
  if (!key.endsWith('_test') && fs.existsSync(FIXTURE)) {
    const raw = JSON.stringify(JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).state)
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(p, raw)
    return raw
  }
  return null
}

/** Write a key's JSON string (value is validated/capped by the caller). */
export async function putStateRaw(key: string, value: string): Promise<void> {
  if (hasSupabase()) {
    const { error } = await supabaseAdmin
      .from('page_content')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) throw new Error(error.message)
    return
  }
  assertFileStoreAllowed()
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(filePath(key), value)
}
