// Quantity-identity check for kitchen.html shape changes (the board's rule 3:
// any shape change must leave every shopping-list quantity identical).
//
//   node scripts/verify-quantities.mjs <before.html> <after.html> <state.json>
//
// Runs each page's script headlessly under a DOM stub, feeds both the same
// state (a {"state": ...} wrapper as returned by /api/kitchen-list, or a bare
// state object), migrates it with that page's own migrate(), and diffs every
// aggregated shopping row — name, unit, section, total, remaining, and the
// per-day parts. Exit 0 = identical, 1 = differences, 2 = harness failure.
//
// First used 2026-08-26 to verify v5→v6 (SKU book) against the live board:
// 49 identical rows, hash 83f5a7c8, on both the deployed page and the branch.
// Get a state to test against with:
//   curl -s https://<deployment>/api/kitchen-list > state.json
import fs from 'fs'
import crypto from 'crypto'

const [beforeHtml, afterHtml, stateJson] = process.argv.slice(2)
if (!beforeHtml || !afterHtml || !stateJson) {
  console.error('usage: node scripts/verify-quantities.mjs <before.html> <after.html> <state.json>')
  process.exit(2)
}

const parsed = JSON.parse(fs.readFileSync(stateJson, 'utf8'))
const liveState = parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed

function runPage(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8')
  let script = html.split('<script>')[1]?.split('</script>')[0]
  if (!script) throw new Error(htmlPath + ': no <script> block found')

  // Export the internals we need from inside the IIFE, and skip boot().
  script = script.replace(
    /\n\s*boot\(\);\s*\n\s*\}\)\(\);\s*$/,
    '\n  globalThis.__test = { migrate: migrate, aggregate: aggregate, remaining: remaining,\n' +
      '    setState: function (s) { state = s; } };\n})();',
  )
  if (!script.includes('__test')) {
    throw new Error(htmlPath + ": injection failed — the script no longer ends with 'boot(); })();'")
  }

  // --- DOM/browser stubs — just enough for the page script to load ---
  function el() {
    const e = {
      style: {}, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false } },
      setAttribute() {}, getAttribute() { return null }, removeAttribute() {},
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { e.children.push(c); return c }, removeChild() {}, remove() {}, replaceChildren() {},
      insertBefore(c) { e.children.push(c); return c }, focus() {}, blur() {}, click() {}, select() {},
      querySelector() { return el() }, querySelectorAll() { return [] }, closest() { return null },
    }
    return new Proxy(e, {
      get(t, p) { return p in t ? t[p] : undefined },
      set(t, p, v) { t[p] = v; return true },
    })
  }
  const documentStub = {
    getElementById: () => el(), createElement: () => el(), createTextNode: (t) => ({ text: t }),
    querySelector: () => el(), querySelectorAll: () => [],
    addEventListener() {}, activeElement: null, visibilityState: 'hidden',
    body: el(), documentElement: el(), title: '',
  }
  const windowStub = {
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    history: { replaceState() {} },
  }
  const locationStub = { hostname: 'headless.test', search: '', href: 'https://headless.test/kitchen.html', pathname: '/kitchen.html' }
  const fn = new Function(
    'document', 'location', 'navigator', 'localStorage', 'window',
    'alert', 'confirm', 'prompt', 'fetch', 'setInterval', 'setTimeout', script,
  )
  fn(
    documentStub, locationStub, { clipboard: undefined, userAgent: 'headless' },
    { getItem: () => null, setItem() {}, removeItem() {} }, windowStub,
    () => {}, () => false, () => null, () => new Promise(() => {}), () => 0, () => 0,
  )

  const t = globalThis.__test
  delete globalThis.__test
  const migrated = t.migrate(JSON.parse(JSON.stringify(liveState)))
  if (!migrated) throw new Error(htmlPath + ': migrate() returned null')
  t.setState(migrated)
  const rows = t.aggregate().map((a) => ({
    key: a.key, n: a.n, unit: a.unit, group: a.group, total: a.total,
    remaining: t.remaining(a), parts: a.parts,
  }))
  return { version: migrated.version, rows }
}

const a = runPage(beforeHtml)
const b = runPage(afterHtml)
const hash = (r) => crypto.createHash('sha256').update(JSON.stringify(r.rows)).digest('hex').slice(0, 8)

console.log(`${beforeHtml}: migrated to v${a.version} — ${a.rows.length} rows, hash ${hash(a)}`)
console.log(`${afterHtml}: migrated to v${b.version} — ${b.rows.length} rows, hash ${hash(b)}`)

if (JSON.stringify(a.rows) === JSON.stringify(b.rows)) {
  console.log('IDENTICAL — every row matches (name/unit/section/total/remaining/parts).')
  process.exit(0)
}
const ka = new Map(a.rows.map((r) => [r.key, r]))
const kb = new Map(b.rows.map((r) => [r.key, r]))
for (const k of new Set([...ka.keys(), ...kb.keys()])) {
  const ra = ka.get(k), rb = kb.get(k)
  if (JSON.stringify(ra) !== JSON.stringify(rb)) {
    console.log('DIFF', k)
    console.log('  before:', JSON.stringify(ra))
    console.log('  after: ', JSON.stringify(rb))
  }
}
process.exit(1)
