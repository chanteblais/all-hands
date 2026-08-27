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
//
// Since migrations/002 every key also carries a revision counter (`rev`):
// putStateChecked() is a compare-and-swap on it, and each successful write
// appends the batch of ops that produced it to `board_ops` — an advisory
// audit log; the blob stays the source of truth. In file-fallback mode the
// file becomes a {"rev": n, "state": ...} wrapper (a bare legacy file reads
// as rev 0) and ops append to .data/<key>.ops.jsonl.

const hasSupabase = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

const DATA_DIR = path.join(process.cwd(), '.data')
const FIXTURE = path.join(process.cwd(), 'data', 'fixtures', 'board-2026-08-26.json')

function filePath(key: string) {
  return path.join(DATA_DIR, key + '.json')
}
function opsPath(key: string) {
  return path.join(DATA_DIR, key + '.ops.jsonl')
}

function assertFileStoreAllowed() {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    throw new Error('Supabase env vars missing in production — refusing file-store fallback')
  }
}

export type StateWithRev = { value: string | null; rev: number }
export type OpsRow = { ops: unknown; actor?: string; source?: string }
export type PutCheckedResult =
  | { ok: true; rev: number }
  | { ok: false; current: StateWithRev } // baseRev was stale — here is what won

// Best-effort audit append. The blob is truth; a lost audit row is the
// accepted worst case, so failures are swallowed (see docs/database.md).
async function appendOpsSupabase(key: string, rev: number, row: OpsRow) {
  try {
    await supabaseAdmin
      .from('board_ops')
      .insert({ board_key: key, rev, ops: row.ops, actor: row.actor ?? null, source: row.source ?? null })
  } catch {
    /* advisory only */
  }
}
function appendOpsFile(key: string, rev: number, row: OpsRow) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.appendFileSync(
      opsPath(key),
      JSON.stringify({ rev, ops: row.ops, actor: row.actor ?? null, source: row.source ?? null, at: new Date().toISOString() }) + '\n',
    )
  } catch {
    /* advisory only */
  }
}

// File wrapper sniff: board state never has both a numeric `rev` and a `state`
// key at top level, so this cannot mistake a legacy bare blob for a wrapper.
function readFileEntry(key: string): { value: string | null; rev: number } {
  const p = filePath(key)
  if (!fs.existsSync(p)) return { value: null, rev: 0 }
  const raw = fs.readFileSync(p, 'utf8')
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && typeof parsed.rev === 'number' && 'state' in parsed) {
      return { value: JSON.stringify(parsed.state), rev: parsed.rev }
    }
  } catch {
    /* fall through — treat as a bare legacy blob */
  }
  return { value: raw, rev: 0 }
}
function writeFileEntry(key: string, value: string, rev: number) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(filePath(key), '{"rev":' + rev + ',"state":' + value + '}')
}

/** State JSON string + revision for a key ({value: null, rev: 0} when absent). */
export async function getStateWithRev(key: string): Promise<StateWithRev> {
  if (hasSupabase()) {
    const { data, error } = await supabaseAdmin
      .from('page_content')
      .select('value, rev')
      .eq('key', key)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return { value: data?.value ?? null, rev: typeof data?.rev === 'number' ? data.rev : 0 }
  }
  assertFileStoreAllowed()
  const entry = readFileEntry(key)
  if (entry.value !== null) return entry
  // First read of the live key on a fresh clone: seed from the fixture. The
  // scratch key (`*_test`) starts empty on purpose — that is what it is for.
  if (!key.endsWith('_test') && fs.existsSync(FIXTURE)) {
    const raw = JSON.stringify(JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).state)
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(filePath(key), raw) // seeded bare = rev 0, wrapped on first write
    return { value: raw, rev: 0 }
  }
  return { value: null, rev: 0 }
}

/** Raw JSON string for a key, or null. */
export async function getStateRaw(key: string): Promise<string | null> {
  return (await getStateWithRev(key)).value
}

/**
 * Compare-and-swap write: succeeds only if the stored rev still equals
 * baseRev, bumping it to baseRev + 1 and appending opsRow to the audit log.
 * A stale baseRev returns the current winner instead of writing.
 */
export async function putStateChecked(
  key: string,
  value: string,
  baseRev: number,
  opsRow?: OpsRow,
): Promise<PutCheckedResult> {
  if (hasSupabase()) {
    const { data, error } = await supabaseAdmin
      .from('page_content')
      .update({ value, updated_at: new Date().toISOString(), rev: baseRev + 1 })
      .eq('key', key)
      .eq('rev', baseRev)
      .select('rev')
    if (error) throw new Error(error.message)
    if (data && data.length) {
      if (opsRow) await appendOpsSupabase(key, baseRev + 1, opsRow)
      return { ok: true, rev: baseRev + 1 }
    }
    // No row matched: the key is missing, or baseRev is stale.
    if (baseRev === 0) {
      const ins = await supabaseAdmin
        .from('page_content')
        .insert({ key, value, updated_at: new Date().toISOString(), rev: 1 })
      if (!ins.error) {
        if (opsRow) await appendOpsSupabase(key, 1, opsRow)
        return { ok: true, rev: 1 }
      }
      // unique violation etc. — someone else created it first; report theirs
    }
    return { ok: false, current: await getStateWithRev(key) }
  }
  assertFileStoreAllowed()
  const current = readFileEntry(key)
  if (current.rev !== baseRev) return { ok: false, current }
  writeFileEntry(key, value, baseRev + 1)
  if (opsRow) appendOpsFile(key, baseRev + 1, opsRow)
  return { ok: true, rev: baseRev + 1 }
}

/**
 * Legacy unconditional write (pre-rev clients, scripts): last-write-wins, but
 * still bumps rev past the current one and leaves a `replace_state` marker in
 * the audit log so every rev transition stays accounted for.
 */
export async function putStateRaw(key: string, value: string): Promise<void> {
  const legacyRow: OpsRow = { ops: [{ op: 'replace_state' }], source: 'legacy' }
  if (hasSupabase()) {
    const current = await getStateWithRev(key)
    const rev = current.rev + 1
    const { error } = await supabaseAdmin
      .from('page_content')
      .upsert({ key, value, updated_at: new Date().toISOString(), rev }, { onConflict: 'key' })
    if (error) throw new Error(error.message)
    await appendOpsSupabase(key, rev, legacyRow)
    return
  }
  assertFileStoreAllowed()
  const current = readFileEntry(key)
  writeFileEntry(key, value, current.rev + 1)
  appendOpsFile(key, current.rev + 1, legacyRow)
}
