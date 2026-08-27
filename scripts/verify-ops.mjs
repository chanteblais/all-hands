// Op-applier checks for kitchen.html (Phase A of op-based writes).
//
//   node scripts/verify-ops.mjs [state.json]        (default: the 2026-08-26 fixture)
//
// Runs the page's script headlessly (same DOM-stub approach as
// verify-quantities.mjs — both injections require the file to end with
// 'boot(); })();'; if that tail ever changes, change BOTH scripts in the same
// commit) and asserts, against real-shaped state:
//
//   1. per-op parity — each op type produces exactly the state change its
//      UI handler used to make (incl. remove_group's groupIds cascade and
//      remove_day's selected scrub)
//   2. determinism — the same op list applied to two clones of the same
//      state yields byte-identical payloads (the Phase B rebase invariant)
//   3. idempotent replay — add_*/remove_* ops refuse to double-apply;
//      absolute set_* ops replay to the same payload
//   4. squashing — per-keystroke ops on one target collapse to one pending op
//
// Exit 0 = all pass, 1 = failures, 2 = harness failure.
import fs from 'fs'

const stateJson = process.argv[2] || 'data/fixtures/board-2026-08-26.json'
const pageHtml = 'public/kitchen.html'

const parsed = JSON.parse(fs.readFileSync(stateJson, 'utf8'))
const fixture = parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed

function loadPage() {
  const html = fs.readFileSync(pageHtml, 'utf8')
  let script = html.split('<script>')[1]?.split('</script>')[0]
  if (!script) throw new Error(pageHtml + ': no <script> block found')
  script = script.replace(
    /\n\s*boot\(\);\s*\n\s*\}\)\(\);\s*$/,
    '\n  globalThis.__test = { migrate: migrate, aggregate: aggregate, remaining: remaining,\n' +
      '    setState: function (s) { state = s; }, getState: function () { return state; },\n' +
      '    payloadStr: function () { return payload(); }, resolve: aiResolve, commit: commit,\n' +
      '    pending: function () { return pendingOps; }, newId: newId, ingredientFor: ingredientFor };\n})();',
  )
  if (!script.includes('__test')) {
    throw new Error(pageHtml + ": injection failed — the script no longer ends with 'boot(); })();'")
  }
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
  return t
}

const t = loadPage()
const clone = (x) => JSON.parse(JSON.stringify(x))
const base = t.migrate(clone(fixture))
if (!base) throw new Error('migrate() returned null on ' + stateJson)
if (base.version !== 8) throw new Error('expected migrate() to land on v8, got v' + base.version)

let pass = 0, fail = 0
function check(name, cond, detail) {
  if (cond) { pass++ }
  else { fail++; console.log('FAIL', name, detail ?? '') }
}
function fresh() { t.setState(clone(base)); return t.getState() }
function S() { return t.getState() }
function findItem(st, id) {
  let hit = null
  st.days.forEach((d) => d.meals.forEach((m) => m.sections.forEach((s) => s.items.forEach((it) => {
    if (it.id === id) hit = { day: d, meal: m, sec: s, item: it }
  }))))
  return hit
}

// pick real anchors from the fixture board
const day0 = base.days[0]
const g0 = day0.groups[0]
const meal0 = day0.meals[0]
const sec0 = meal0.sections.find((s) => s.items.length) || meal0.sections[0]
const item0 = sec0.items[0]
const pan0 = base.pantry[0]

// ---- 1. per-op parity ----------------------------------------------------
fresh()
check('set_pantry by id', (() => {
  t.commit({ op: 'set_pantry', pantryId: pan0.id, name: pan0.n, unit: pan0.unit, qty: 42.5 }, 'test')
  return S().pantry.find((p) => p.id === pan0.id).qty === 42.5
})())

fresh()
check('set_pantry id beats a same-named row', (() => {
  // two rows may share a name (two Bacon rows) — id addressing must never
  // touch the wrong one
  const other = S().pantry[1]
  t.commit({ op: 'set_pantry', pantryId: other.id, name: pan0.n, unit: other.unit, qty: 7 }, 'test')
  return S().pantry[1].qty === 7 && S().pantry.find((p) => p.id === pan0.id).qty === pan0.qty
})())

fresh()
check('rename_pantry / remove_pantry by id', (() => {
  t.commit({ op: 'rename_pantry', pantryId: pan0.id, name: pan0.n, newName: 'Renamed row' }, 'test')
  const renamed = S().pantry.find((p) => p.id === pan0.id).n === 'Renamed row'
  t.commit({ op: 'remove_pantry', pantryId: pan0.id, name: 'Renamed row' }, 'test')
  return renamed && !S().pantry.some((p) => p.id === pan0.id)
})())

fresh()
check('add_pantry, and duplicate id refused', (() => {
  const id = t.newId('p')
  const n1 = t.commit({ op: 'add_pantry', row: { id, n: 'Test beans', qty: 3, unit: 'lb' } }, 'test')
  const n2 = t.commit({ op: 'add_pantry', row: { id, n: 'Test beans', qty: 3, unit: 'lb' } }, 'test')
  return n1 === 1 && n2 === 0 && S().pantry.filter((p) => p.id === id).length === 1
})())

fresh()
check('set_headcount rounds and applies', (() => {
  t.commit({ op: 'set_headcount', dayId: day0.id, groupId: g0.id, count: 100.4 }, 'test')
  return S().days[0].groups[0].count === 100
})())

fresh()
check('set_buffer / rename_day / rename_group', (() => {
  t.commit([
    { op: 'set_buffer', dayId: day0.id, buffer: 15 },
    { op: 'rename_day', dayId: day0.id, name: 'Renamed day' },
    { op: 'rename_group', dayId: day0.id, groupId: g0.id, label: 'Crew' },
  ], 'test')
  const d = S().days[0]
  return d.buffer === 15 && d.name === 'Renamed day' && d.groups[0].label === 'Crew'
})())

fresh()
check('set_portion by itemId', (() => {
  t.commit({ op: 'set_portion', dayId: day0.id, sectionId: sec0.id, itemId: item0.id, name: item0.n, per: 9.25 }, 'test')
  return findItem(S(), item0.id).item.per === 9.25
})())

fresh()
check('set_item_groups: explicit empty array means nobody', (() => {
  t.commit({ op: 'set_item_groups', dayId: day0.id, sectionId: sec0.id, itemId: item0.id, name: item0.n, groupIds: [] }, 'test')
  return findItem(S(), item0.id).item.groupIds.length === 0
})())

fresh()
check('add_menu_item with pre-minted ids creates item + pantry row', (() => {
  const id = t.newId('i'), pid = t.newId('p')
  t.commit({ op: 'add_menu_item', dayId: day0.id, mealId: meal0.id, sectionId: sec0.id,
    id, pantryId: pid, name: 'Zz test item', unit: 'oz', per: 4, groupIds: [g0.id] }, 'test')
  const hit = findItem(S(), id)
  const pan = S().pantry.find((p) => p.id === pid)
  return hit && hit.item.groupIds.join() === g0.id && pan && pan.unit === 'lb'
})())

fresh()
check('add_menu_item duplicate id refused; absent groupIds -> everyone; empty -> nobody', (() => {
  const id = t.newId('i')
  const n1 = t.commit({ op: 'add_menu_item', dayId: day0.id, sectionId: sec0.id, id, name: 'Zz all', unit: 'pc', per: 1 }, 'test')
  const n2 = t.commit({ op: 'add_menu_item', dayId: day0.id, sectionId: sec0.id, id, name: 'Zz all', unit: 'pc', per: 1 }, 'test')
  const all = findItem(S(), id).item.groupIds.length === day0.groups.length
  const id2 = t.newId('i')
  t.commit({ op: 'add_menu_item', dayId: day0.id, sectionId: sec0.id, id: id2, name: 'Zz none', unit: 'pc', per: 1, groupIds: [] }, 'test')
  const none = findItem(S(), id2).item.groupIds.length === 0
  return n1 === 1 && n2 === 0 && all && none
})())

fresh()
check('remove_menu_item by itemId', (() => {
  t.commit({ op: 'remove_menu_item', dayId: day0.id, sectionId: sec0.id, itemId: item0.id, name: item0.n }, 'test')
  return !findItem(S(), item0.id)
})())

fresh()
check('check/uncheck/clear_checked and set_sku', (() => {
  const ingId = item0.ingredientId
  t.commit([
    { op: 'check_item', name: item0.n, unit: item0.unit },
    { op: 'set_sku', key: ingId, sku: ' 12345 ' },
  ], 'test')
  const checkedOn = S().checked[ingId] === true && S().skus[ingId] === '12345'
  t.commit([{ op: 'clear_checked' }, { op: 'set_sku', key: ingId, sku: '' }], 'test')
  const skuOnUnknown = t.commit({ op: 'set_sku', key: 'no-such-ing', sku: '9' }, 'test')
  return checkedOn && Object.keys(S().checked).length === 0 && !(ingId in S().skus) && skuOnUnknown === 0
})())

fresh()
check('select_days replaces the trip; set_use_pantry toggles', (() => {
  t.commit([
    { op: 'select_days', dayIds: [day0.id] },
    { op: 'set_use_pantry', on: !base.usePantry },
  ], 'test')
  return S().selected.join() === day0.id && S().usePantry === !base.usePantry
})())

fresh()
check('add_day selects it and clones the op payload', (() => {
  const day = { id: t.newId('d'), name: 'Zz day', buffer: 10, groups: [{ id: t.newId('g'), label: 'A', count: 5 }], meals: [] }
  t.commit({ op: 'add_day', day }, 'test')
  day.name = 'MUTATED AFTER APPLY'
  const st = S().days.find((d) => d.id === day.id)
  return st && st.name === 'Zz day' && S().selected.indexOf(day.id) > -1
})())

fresh()
check('remove_day scrubs selected', (() => {
  t.commit({ op: 'remove_day', dayId: day0.id }, 'test')
  return !S().days.some((d) => d.id === day0.id) && S().selected.indexOf(day0.id) === -1
})())

fresh()
check('add_group / remove_group with groupIds cascade', (() => {
  const gid = t.newId('g')
  t.commit({ op: 'add_group', dayId: day0.id, group: { id: gid, label: 'Zz group', count: 3 } }, 'test')
  t.commit({ op: 'set_item_groups', dayId: day0.id, sectionId: sec0.id, itemId: item0.id, name: item0.n, groupIds: [gid, g0.id] }, 'test')
  t.commit({ op: 'remove_group', dayId: day0.id, groupId: gid }, 'test')
  const it = findItem(S(), item0.id).item
  return !S().days[0].groups.some((g) => g.id === gid) && it.groupIds.join() === g0.id
})())

fresh()
check('add_meal / rename_meal / set_meal_times / remove_meal / add_section / set_section_groups', (() => {
  const mid = t.newId('m'), sid = t.newId('s')
  t.commit({ op: 'add_meal', dayId: day0.id, meal: { id: mid, label: 'Zz meal', times: '', sections: [] } }, 'test')
  t.commit({ op: 'rename_meal', dayId: day0.id, mealId: mid, label: 'Zz late' }, 'test')
  t.commit({ op: 'set_meal_times', dayId: day0.id, mealId: mid, times: '11–12' }, 'test')
  t.commit({ op: 'add_section', dayId: day0.id, mealId: mid, section: { id: sid, name: 'Zz course', note: '', items: [] } }, 'test')
  t.commit({ op: 'set_section_groups', dayId: day0.id, sectionId: sec0.id, groupIds: [g0.id] }, 'test')
  const m = S().days[0].meals.find((x) => x.id === mid)
  const secOk = findItem(S(), item0.id).item.groupIds.join() === g0.id
  const okSoFar = m && m.label === 'Zz late' && m.times === '11–12' && m.sections[0].id === sid && secOk
  t.commit({ op: 'remove_meal', dayId: day0.id, mealId: mid }, 'test')
  return okSoFar && !S().days[0].meals.some((x) => x.id === mid)
})())

fresh()
check('closeout pair: set_pantry(absolute) + uncheck_item', (() => {
  t.commit({ op: 'check_item', name: item0.n, unit: item0.unit }, 'test')
  const before = Object.keys(S().checked).length
  t.commit([
    { op: 'set_pantry', pantryId: pan0.id, name: pan0.n, unit: pan0.unit, qty: 11.5 },
    { op: 'uncheck_item', name: item0.n, unit: item0.unit },
  ], 'test')
  return before === 1 && S().pantry.find((p) => p.id === pan0.id).qty === 11.5 && Object.keys(S().checked).length === 0
})())

// ---- 2. determinism (the Phase B rebase invariant) -----------------------
{
  const ops = [
    { op: 'set_headcount', dayId: day0.id, groupId: g0.id, count: 77 },
    { op: 'add_menu_item', dayId: day0.id, mealId: meal0.id, sectionId: sec0.id, id: 'i-det-1', pantryId: 'p-det-1', ingredientId: 'n-det-1', name: 'Det item', unit: 'oz', per: 2 },
    { op: 'set_pantry', pantryId: pan0.id, name: pan0.n, unit: pan0.unit, qty: 5 },
    { op: 'remove_menu_item', dayId: day0.id, sectionId: sec0.id, itemId: item0.id, name: item0.n },
  ]
  fresh(); t.commit(clone(ops), 'test'); const a = t.payloadStr()
  fresh(); t.commit(clone(ops), 'test'); const b = t.payloadStr()
  check('determinism: same ops on two clones -> identical payloads', a === b)
}

// ---- 3. rebase rehearsal -------------------------------------------------
{
  // "A" made local edits; "B" (the server) got a concurrent change; replaying
  // A's pending ops onto B must keep both.
  const aOps = [
    { op: 'set_portion', dayId: day0.id, sectionId: sec0.id, itemId: item0.id, name: item0.n, per: 6 },
    { op: 'add_pantry', row: { id: 'p-reb-1', n: 'Rebase beans', qty: 2, unit: 'lb' } },
  ]
  fresh()
  t.commit({ op: 'set_headcount', dayId: day0.id, groupId: g0.id, count: 200 }, 'test') // B's concurrent edit
  t.commit(clone(aOps), 'test') // A's ops replayed on top
  const st = S()
  check('rebase: both sides survive',
    st.days[0].groups[0].count === 200
    && findItem(st, item0.id).item.per === 6
    && st.pantry.some((p) => p.id === 'p-reb-1'))
}

// ---- 4. idempotent replay ------------------------------------------------
{
  fresh()
  const addRemove = [
    { op: 'add_pantry', row: { id: 'p-idem-1', n: 'Idem beans', qty: 1, unit: 'lb' } },
    { op: 'remove_menu_item', dayId: day0.id, sectionId: sec0.id, itemId: item0.id, name: item0.n },
  ]
  const n1 = t.commit(clone(addRemove), 'test')
  const p1 = t.payloadStr()
  const n2 = t.commit(clone(addRemove), 'test')
  const p2 = t.payloadStr()
  check('idempotent replay: adds/removes refuse the second pass', n1 === 2 && n2 === 0 && p1 === p2)

  const sets = [
    { op: 'set_buffer', dayId: day0.id, buffer: 12 },
    { op: 'set_pantry', pantryId: pan0.id, name: pan0.n, unit: pan0.unit, qty: 9 },
  ]
  t.commit(clone(sets), 'test')
  const q1 = t.payloadStr()
  t.commit(clone(sets), 'test')
  check('idempotent replay: absolute sets converge', q1 === t.payloadStr())
}

// ---- 5. ingredient entities (v8) -----------------------------------------
{
  fresh()
  const ingId = item0.ingredientId
  check('rename_ingredient writes through everywhere and squashes', (() => {
    t.commit({ op: 'select_days', dayIds: [day0.id] }, 'test') // item0's day, so it aggregates
    const before = t.pending().length
    t.commit({ op: 'rename_ingredient', ingredientId: ingId, name: 'Zz renam' }, 'test')
    t.commit({ op: 'rename_ingredient', ingredientId: ingId, name: 'Zz renamed' }, 'test')
    const st = S()
    const ing = st.ingredients.find((i) => i.id === ingId)
    const itemFollows = findItem(st, item0.id).item.n === 'Zz renamed'
    const pantryFollows = st.pantry.filter((p) => p.ingredientId === ingId).every((p) => p.n === 'Zz renamed')
    const squashed = t.pending().length - before === 1
    const aggFollows = t.aggregate().find((a) => a.key === ingId)?.n === 'Zz renamed'
    return ing.name === 'Zz renamed' && itemFollows && pantryFollows && squashed && aggFollows
  })())

  fresh()
  check('rename_ingredient refuses a name owned by another in-class ingredient', (() => {
    const other = S().ingredients.find((i) => i.id !== ingId && i.unitClass === t.getState().ingredients.find((x) => x.id === ingId).unitClass)
    return t.commit({ op: 'rename_ingredient', ingredientId: ingId, name: other.name }, 'test') === 0
  })())

  fresh()
  check('merge_ingredients: full absorption', (() => {
    const st = S()
    const into = st.ingredients.find((i) => i.id === ingId)
    const from = st.ingredients.find((i) => i.id !== ingId && i.unitClass === into.unitClass && st.pantry.some((p) => p.ingredientId === i.id))
    const fromName = t.ingredientFor(from.name, from.unitClass).id === from.id ? from.name : null
    const intoPantryBefore = st.pantry.filter((p) => p.ingredientId === into.id).reduce((a, p) => a + (p.qty || 0), 0)
    const fromPantryBefore = st.pantry.filter((p) => p.ingredientId === from.id).reduce((a, p) => a + (p.qty || 0), 0)
    t.commit([
      { op: 'check_item', ingredientId: from.id, name: from.name },
      { op: 'set_sku', key: from.id, sku: '777' },
    ], 'test')
    const n1 = t.commit({ op: 'merge_ingredients', fromId: from.id, intoId: into.id }, 'test')
    const s2 = S()
    const gone = !s2.ingredients.some((i) => i.id === from.id)
    const noRowLeft = !s2.pantry.some((p) => p.ingredientId === from.id) && (() => {
      let any = false
      s2.days.forEach((d) => d.meals.forEach((m) => m.sections.forEach((s) => s.items.forEach((it) => { if (it.ingredientId === from.id) any = true }))))
      return !any
    })()
    const qtySummed = Math.abs(s2.pantry.filter((p) => p.ingredientId === into.id).reduce((a, p) => a + (p.qty || 0), 0) - (intoPantryBefore + fromPantryBefore)) < 0.01
    const oneRow = s2.pantry.filter((p) => p.ingredientId === into.id).length === 1
    const checkedMoved = s2.checked[into.id] === true && !(from.id in s2.checked)
    const skuMoved = s2.skus[into.id] === '777' && !(from.id in s2.skus)
    const aliasWorks = fromName && t.ingredientFor(fromName, into.unitClass)?.id === into.id
    const replayRefused = t.commit({ op: 'merge_ingredients', fromId: from.id, intoId: into.id }, 'test') === 0
    return n1 === 1 && gone && noRowLeft && qtySummed && oneRow && checkedMoved && skuMoved && aliasWorks && replayRefused
  })())

  fresh()
  check('merge_ingredients refuses cross-class', (() => {
    const st = S()
    const w = st.ingredients.find((i) => i.unitClass === 'w')
    const c = st.ingredients.find((i) => i.unitClass === 'c')
    return w && c && t.commit({ op: 'merge_ingredients', fromId: w.id, intoId: c.id }, 'test') === 0
  })())

  fresh()
  check('add_alias: resolves in dictation, idempotent, conflicts refused', (() => {
    const n1 = t.commit({ op: 'add_alias', ingredientId: ingId, alias: 'Zz Nickname' }, 'test')
    const resolves = t.ingredientFor('zz nickname', S().ingredients.find((i) => i.id === ingId).unitClass)?.id === ingId
    const checkViaAlias = t.commit({ op: 'check_item', name: 'Zz Nickname', unit: item0.unit }, 'test') === 1 && S().checked[ingId] === true
    const again = t.commit({ op: 'add_alias', ingredientId: ingId, alias: 'zz nickname' }, 'test') === 0
    const other = S().ingredients.find((i) => i.id !== ingId && i.unitClass === S().ingredients.find((x) => x.id === ingId).unitClass)
    const conflict = t.commit({ op: 'add_alias', ingredientId: other.id, alias: 'Zz Nickname' }, 'test') === 0
    return n1 === 1 && resolves && checkViaAlias && again && conflict
  })())

  check('check_item on an unknown name errors (no orphan keys)', (() => {
    fresh()
    const before = Object.keys(S().checked).length
    const n = t.commit({ op: 'check_item', name: 'Totally Unknown Thing', unit: 'pc' }, 'test')
    return n === 0 && Object.keys(S().checked).length === before
  })())

  check('migration idempotency: migrate(payload(migrate(v7))) is a fixpoint', (() => {
    fresh()
    const a = t.payloadStr()
    t.setState(t.migrate(JSON.parse(a)))
    return t.payloadStr() === a
  })())

  check('healing: a blob stripped by a stale pre-v8 page comes back whole', (() => {
    fresh()
    const a = JSON.parse(t.payloadStr())
    const rowsA = JSON.stringify(t.aggregate())
    const checkedA = JSON.stringify(a.checked), skusA = JSON.stringify(a.skus)
    delete a.ingredients
    a.days.forEach((d) => d.meals.forEach((m) => m.sections.forEach((s) => s.items.forEach((it) => { delete it.ingredientId }))))
    a.pantry.forEach((p) => { delete p.ingredientId })
    t.setState(t.migrate(a))
    const healed = JSON.stringify(t.aggregate()) === rowsA
    const b = JSON.parse(t.payloadStr())
    return healed && JSON.stringify(b.checked) === checkedA && JSON.stringify(b.skus) === skusA
  })())

  check('fresh-row set_pantry links so remaining() sees the stock', (() => {
    fresh()
    S().usePantry = true
    const agg0 = t.aggregate().find((a) => !S().pantry.some((p) => p.ingredientId === a.key && p.qty > 0))
    if (!agg0) return true // fixture has stock everywhere — nothing to test
    S().pantry = S().pantry.filter((p) => p.ingredientId !== agg0.key) // simulate no row at all
    t.commit({ op: 'set_pantry', id: t.newId('p'), ingredientId: agg0.key, name: agg0.n, unit: agg0.unit === 'oz' ? 'lb' : 'pc', qty: 5 }, 'test')
    const agg1 = t.aggregate().find((a) => a.key === agg0.key)
    return t.remaining(agg1) < agg1.total || agg1.total === 0
  })())
}

// ---- 6. squashing --------------------------------------------------------
{
  fresh()
  const before = t.pending().length
  t.commit({ op: 'rename_day', dayId: day0.id, name: 'T' }, 'test')
  t.commit({ op: 'rename_day', dayId: day0.id, name: 'Ta' }, 'test')
  t.commit({ op: 'rename_day', dayId: day0.id, name: 'Taco' }, 'test')
  const grew = t.pending().length - before
  const last = t.pending()[t.pending().length - 1]
  check('squash: three keystrokes -> one pending op holding the last value', grew === 1 && last.name === 'Taco')
}

console.log(pass + ' passed, ' + fail + ' failed')
process.exit(fail ? 1 : 0)
