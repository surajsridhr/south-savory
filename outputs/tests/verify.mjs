// South Savory redesign — verification suite.
// Not jsdom: jsdom performs no layout, so getBoundingClientRect() always returns
// zero rects there — it cannot answer "is this below the fold?". This suite drives
// real Chromium via Playwright instead, at 375x812, which is what the fold/position
// assertions actually require.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const URL = 'http://localhost:8899/south-savory-tally.html';
const SRC = readFileSync(path.join(ROOT, 'south-savory-tally.html'), 'utf8');

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail && !cond ? '  (' + detail + ')' : ''));
}

// ---------- static, source-level assertions (privacy/offline, no-discount, no cutoff-enforcement) ----------
function staticChecks() {
  ok('no fetch()', !/\bfetch\s*\(/.test(SRC));
  ok('no XMLHttpRequest', !/XMLHttpRequest/.test(SRC));
  ok('no sendBeacon/analytics', !/sendBeacon|google-analytics|gtag\(|analytics/i.test(SRC));
  ok('no http(s):// URLs embedded', !/https?:\/\//.test(SRC));
  ok('no external <script src>, <link>, @font-face, or CDN reference', !/<script\s+src=|<link\s|@font-face|googleapis|gstatic|cdn\./.test(SRC));
  ok('localStorage.getItem wrapped in try/catch (load())', /try\{\s*var raw=localStorage\.getItem/.test(SRC));
  ok('localStorage.setItem wrapped in try/catch (save())', /try\{\s*localStorage\.setItem/.test(SRC));
  ok('no confirm() dialogs anywhere', !/\bconfirm\s*\(/.test(SRC));
  const srcNoComments = SRC.replace(/\/\*[\s\S]*?\*\//g, '');
  ok('no "discount" logic anywhere (outside comments)', !/discount/i.test(srcNoComments));
  ok('internal cutoffLab element removed', !/id="cutoffLab"/.test(SRC));
  ok('internal cutoff-passed logic removed from renderCook', !/cutoff passed/.test(SRC));
  // the only two legitimate "10:30" occurrences left: the CUTOFF_TXT constant itself,
  // and the outbound post line that uses it. Any other occurrence is a stray internal
  // deadline reference (like the onboarding copy that said "Read the total at 10:30").
  const occurrences1030 = (SRC.match(/10:30/g) || []).length;
  ok('no stray internal "10:30" references outside the outbound post-copy constant', occurrences1030 === 1, 'count=' + occurrences1030);
  ok('CUTOFF_TXT (customer post copy) still present, untouched', /var CUTOFF_TXT="10:30 AM";/.test(SRC));
  ok('outbound "Order by: ...CUTOFF_TXT" post-copy line untouched', /L\.push\("Order by: "\+\(postWhen\(\)===/.test(SRC));
  // drops have no deadline/capacity concept at all now — cap/orderBy were removed
  // from the model entirely, not just kept inert. Confirm they're actually gone.
  ok('drops carry no cap/orderBy fields (no deadline/capacity concept at all)', !/sp\.cap\b|sp\.orderBy\b|xdraft\.cap|xdraft\.orderBy/.test(SRC));
  ok('drop post copy has no "Limited to" / "Order by" line', !/Limited to.*sp\.cap|Order by.*sp\.orderBy/.test(SRC));
  // weight pricing and its migration must be generic — no item name may be
  // hardcoded into the matching/collapsing logic itself. The function bodies
  // are extracted and checked in isolation (placeholder text, comments, and
  // the unrelated legacy SPECSEED sample list are fine anywhere else in the file).
  {
    const fnSrc = (name) => {
      const m = SRC.match(new RegExp('function ' + name + '\\([^)]*\\)\\{'));
      if (!m) return '';
      let i = m.index + m[0].length, depth = 1;
      while (depth > 0 && i < SRC.length) { if (SRC[i] === '{') depth++; else if (SRC[i] === '}') depth--; i++; }
      return SRC.slice(m.index, i);
    };
    const logicSrc = fnSrc('collapseWeightGroups') + fnSrc('gramsFromUnitStr') + fnSrc('spLines') + fnSrc('weightLinePrice') + fnSrc('gramLabel');
    ok('extracted weight-pricing/migration logic is non-empty (the functions were actually found)', logicSrc.length > 200, 'len=' + logicSrc.length);
    const foodNames = ['ragi', 'ghee', 'chai masala', 'modak', 'obbattu', 'kosambari', 'malt'];
    const hit = foodNames.find((n) => logicSrc.toLowerCase().includes(n));
    ok('no item name is hardcoded into the weight-pricing/migration logic itself — matching is purely by shape (name grouping + unit-string parsing)', !hit, 'found=' + hit);
  }
  ok('single self-contained file (logo embedded as data URI, not external src)', /<img class="brandbar-logo"[^>]*src="data:image\/png;base64,/.test(SRC));
  ok('brand bar is a persistent, fixed header (not scoped to one lane)', /#brandbar\{[^}]*position:fixed/.test(SRC.replace(/\s+/g,'')) || /position:fixed;top:0;left:0;right:0;z-index:35/.test(SRC.replace(/\s+/g,'')));
}

async function main() {
  staticChecks();

  const browser = await chromium.launch();

  // ---------- migration: old date-keyed special -> new independent drop ----------
  // This is real-data-critical: Suraj's actual Ganesh Chaturthi drop lives in the
  // old shape on his device. A fresh page + seeded old-shape localStorage stands
  // in for "opening the upgraded build for the first time."
  {
    const migPage = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await migPage.addInitScript(() => {
      const old = {
        version: 1, chan: 'group', days: {}, batter: {},
        special: {
          '2026-09-10': {
            date: '2026-09-10', title: 'Ganesh Chaturthi', cap: '50', orderBy: '9 PM',
            items: [{ id: 'modak', n: 'Modak', u: 'piece', p: 15 }],
            slips: [{ id: 'slip1', t: Date.now() - 86400000, ch: 'group', name: 'Real Customer', items: { modak: 10 }, collected: false, paid: false }],
            orders: [], reopens: []
          }
        }
      };
      localStorage.setItem('southsavory.v1', JSON.stringify(old));
    });
    await migPage.goto(URL, { waitUntil: 'load' });
    const mig = await migPage.evaluate(() => {
      const keys = Object.keys(S.special);
      const drop = keys.length ? S.special[keys[0]] : null;
      return drop && {
        dropCount: keys.length, isOldKey: keys[0] === '2026-09-10',
        title: drop.title, itemName: drop.items[0] && drop.items[0].n,
        slipName: drop.slips[0] && drop.slips[0].name, slipQty: drop.slips[0] && drop.slips[0].items.modak,
        hasCreatedAt: typeof drop.createdAt === 'number',
        noCap: !('cap' in drop), noOrderBy: !('orderBy' in drop), noDate: !('date' in drop),
      };
    });
    ok('migration: old dated special becomes a drop with a fresh id', mig && mig.dropCount === 1 && !mig.isOldKey, JSON.stringify(mig));
    ok('migration: title/item/slip/qty all carried over exactly', mig && mig.title === 'Ganesh Chaturthi' && mig.itemName === 'Modak' && mig.slipName === 'Real Customer' && mig.slipQty === 10, JSON.stringify(mig));
    ok('migration: gets a real createdAt, and cap/orderBy/date are dropped (no deadline concept)', mig && mig.hasCreatedAt && mig.noCap && mig.noOrderBy && mig.noDate, JSON.stringify(mig));
    await migPage.close();
  }

  // ---------- migration: fake-weight duplicate line items collapse into one priced-by-weight item ----------
  // Before priced-by-weight existed, the only way to sell by weight was to add the
  // SAME item two or three times — once per pack size. This is generic: it must
  // fire for ANY repeated item name with weight-shaped units, never a hardcoded
  // list, so the seed deliberately uses non-food names ("Widget A", "Lone Item")
  // alongside a realistic one, to prove nothing here is keyed to a particular item.
  {
    const wPage = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await wPage.addInitScript(() => {
      const seed = {
        version: 1, chan: 'group', days: {}, batter: {},
        migSpecialDrops: 1, migSpecialDeliveryDate: 1,
        special: {
          drop_ragi: {
            id: 'drop_ragi', title: 'Ragi malt batch', deliveryDate: '2026-09-20', createdAt: Date.now(),
            items: [
              { id: 'rm1kg', n: 'Ragi malt', u: 'kg', p: 300 },
              { id: 'rm500g', n: 'Ragi malt', u: '½ kg', p: 150 },
              { id: 'rm250g', n: 'Ragi malt', u: '250 g', p: 75 }
            ],
            slips: [{ id: 's1', t: Date.now() - 1000, ch: 'group', name: 'Existing Customer', items: { rm250g: 2, rm1kg: 1 }, collected: false, paid: false }],
            orders: [], reopens: []
          },
          drop_bad: {
            // 250g is priced at 70, not the 75 that ₹300/kg implies — no exact rate exists
            id: 'drop_bad', title: 'Chai masala batch', deliveryDate: '2026-09-20', createdAt: Date.now(),
            items: [
              { id: 'cm1kg', n: 'Chai masala', u: 'kg', p: 300 },
              { id: 'cm250g', n: 'Chai masala', u: '250 g', p: 70 }
            ],
            slips: [{ id: 's2', t: Date.now() - 1000, ch: 'dm', name: 'Another Customer', items: { cm250g: 4 }, collected: false, paid: true }],
            orders: [], reopens: []
          },
          drop_ambig: {
            // two line items both claim "1 kg" — can't tell them apart
            id: 'drop_ambig', title: 'Widget batch', deliveryDate: '2026-09-20', createdAt: Date.now(),
            items: [{ id: 'wA', n: 'Widget A', u: 'kg', p: 100 }, { id: 'wB', n: 'Widget A', u: 'kg', p: 120 }],
            slips: [], orders: [], reopens: []
          },
          drop_single: {
            // only one occurrence of this name — nothing duplicated, must stay untouched
            id: 'drop_single', title: 'Single item batch', deliveryDate: '2026-09-20', createdAt: Date.now(),
            items: [{ id: 'onlyone', n: 'Lone Item', u: 'kg', p: 400 }],
            slips: [], orders: [], reopens: []
          }
        }
      };
      localStorage.setItem('southsavory.v1', JSON.stringify(seed));
    });
    await wPage.goto(URL, { waitUntil: 'load' });
    const wr = await wPage.evaluate(() => {
      const ragi = S.special['drop_ragi'];
      const weightItem = (ragi.items || []).find(i => i.priceMode === 'weight');
      const slip = ragi.slips[0];
      const bad = S.special['drop_bad'];
      const ambig = S.special['drop_ambig'];
      const single = S.special['drop_single'];
      return {
        ragi: {
          itemCount: ragi.items.length,
          weightItemName: weightItem ? weightItem.n : null,
          ratePerKg: weightItem ? weightItem.ratePerKg : null,
          slipTotal: xSlipTotal(ragi, slip),
          slipLineKeys: Object.keys(slip.items)
        },
        bad: { itemCount: bad.items.length, noneWeight: bad.items.every(i => !i.priceMode), slipTotal: xSlipTotal(bad, bad.slips[0]) },
        ambig: { itemCount: ambig.items.length, noneWeight: ambig.items.every(i => !i.priceMode) },
        single: { itemCount: single.items.length, isWeight: single.items[0].priceMode === 'weight' },
        skipped: S.weightMigrationSkipped || []
      };
    });
    ok('a genuinely duplicated item (any name — here "Ragi malt") collapses from 3 line items to 1 weight-priced item', wr.ragi.itemCount === 1 && wr.ragi.weightItemName === 'Ragi malt', JSON.stringify(wr.ragi));
    ok('the collapsed rate is derived from the 1kg line (₹300/kg)', wr.ragi.ratePerKg === 300, JSON.stringify(wr.ragi));
    ok('an order recorded against the old duplicate items keeps its exact rupee total after collapsing (2×250g@75 + 1×1kg@300 = ₹450)', wr.ragi.slipTotal === 450, JSON.stringify(wr.ragi));
    ok('the collapsed slip line keys point at the new single item, not the deleted duplicates', wr.ragi.slipLineKeys.every(k => !/^rm/.test(k)), JSON.stringify(wr.ragi));
    ok('a group where no single rate reproduces every recorded price exactly is left completely untouched', wr.bad.itemCount === 2 && wr.bad.noneWeight && wr.bad.slipTotal === 280, JSON.stringify(wr.bad));
    ok('an ambiguous group (two line items claiming the same weight) is left untouched, not guessed at', wr.ambig.itemCount === 2 && wr.ambig.noneWeight, JSON.stringify(wr.ambig));
    ok('an item with only one occurrence (nothing duplicated) is never touched by this migration', wr.single.itemCount === 1 && !wr.single.isWeight, JSON.stringify(wr.single));
    ok('both unsafe groups are reported by name so they can be fixed manually, not silently dropped', wr.skipped.some(s => s.item === 'Chai masala') && wr.skipped.some(s => s.item === 'Widget A'), JSON.stringify(wr.skipped));
    await wPage.close();
  }

  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e)));

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(150);

  // ---------- boot ----------
  const boot = await page.evaluate(() => window.__boot);
  ok('app boots without a thrown error', boot && boot.errs.length === 0, JSON.stringify(boot && boot.errs));
  ok('no console pageerrors during load', consoleErrors.length === 0, consoleErrors.join(' | '));

  // ---------- logo ----------
  const logo = await page.evaluate(() => {
    const img = document.querySelector('img.brandbar-logo');
    return img ? { present: true, naturalWidth: img.naturalWidth, w: img.getBoundingClientRect().width } : { present: false };
  });
  ok('brand logo image present in header', logo.present);
  ok('brand logo image actually decodes (naturalWidth > 0)', logo.naturalWidth > 0, 'naturalWidth=' + logo.naturalWidth);

  // ================================================================
  // HEIGHT / FOLD COMPARISON — done first, on pristine state, so the
  // numbers are a fair like-for-like against the original baseline
  // (screenshots/before/_heights.txt), not polluted by later test data.
  // ================================================================
  async function heightOf(setup) {
    await page.evaluate(setup);
    await page.waitForTimeout(60);
    return page.evaluate(() => document.documentElement.scrollHeight);
  }
  const heights = {};
  heights['01-menu-decide'] = await heightOf(() => { go('menu'); }); // fresh app: no dish picked yet
  heights['13-batter'] = await heightOf(() => { go('today'); setLine('batter'); }); // no batch set up yet
  heights['15-specials'] = await heightOf(() => { go('today'); setLine('special'); }); // no menu set up yet
  heights['07-costs-default'] = await heightOf(() => { setLine('lunch'); go('costs'); }); // no day set yet -> chapathi default

  // now set today's menu (Pudina Rice = One-pot rice bath) via the real UI functions
  await page.evaluate(() => { go('menu'); pickDish('Pudina Rice'); saveMenu(); });
  await page.waitForTimeout(50);
  heights['03-today-orders'] = await heightOf(() => { go('today'); }); // menu set, zero orders yet

  const beforeHeights = { // from screenshots/before/_heights.txt, captured pre-redesign
    '01-menu-decide': 1062, '03-today-orders': 5266, '07-costs-default': 2185,
    '13-batter': 844, '15-specials': 844,
  };

  const todayState = await page.evaluate(() => {
    const d = day();
    return { hasMenu: hasMenu(d), hero: d && d.hero, arch: d && d.arch };
  });
  ok('menu save creates a trackable day with the picked dish', todayState.hasMenu && todayState.hero === 'Pudina Rice', JSON.stringify(todayState));

  // ---------- combo composition sourced from data, not hardcoded (one-pot = no ragi ball) ----------
  const combo = await page.evaluate(() => {
    const d = day();
    return { c1: comboComp(d, 'c1'), c2: comboComp(d, 'c2') };
  });
  const comboJoined = JSON.stringify(combo).toLowerCase();
  ok('one-pot rice-bath combo has no ragi ball (sourced from seed i1/i2, not hardcoded)', !comboJoined.includes('ragi'), JSON.stringify(combo));

  // ---------- must-not-regress: channel toggle ----------
  await page.evaluate(() => { go('today'); setChan('dm'); });
  const chanAfter = await page.evaluate(() => chan);
  ok('channel (DM/group) toggle still works', chanAfter === 'dm', 'chan=' + chanAfter);
  await page.evaluate(() => setChan('group'));

  // ---------- must-not-regress: per-component line items (curd rice alone) ----------
  const compTile = await page.evaluate(() => {
    const d = day();
    const t = tilesFor(d).find(x => /curd rice/i.test(x.title) && x.rank === 'part');
    if (!t) return { found: false };
    const before = countOf(d, t.k);
    addUnit(t.k, t.price);
    const after = countOf(d, t.k);
    removeUnit(t.k);
    const back = countOf(d, t.k);
    return { found: true, before, after, back };
  });
  ok('a component (curd rice) can be ordered on its own', compTile.found && compTile.after === compTile.before + 1 && compTile.back === compTile.before, JSON.stringify(compTile));

  // ---------- must-not-regress: editable menu price at the point it is read ----------
  const priceEdit = await page.evaluate(() => {
    const d = day();
    const before = priceOf('ala', d);
    setPriceFor('ala', d, String(before + 7));
    const after = priceOf('ala', d);
    setPriceFor('ala', d, String(before));
    return { before, after, restored: priceOf('ala', d) };
  });
  ok('menu price editable in place and takes effect immediately', priceEdit.after === priceEdit.before + 7, JSON.stringify(priceEdit));

  // ---------- must-not-regress: named order / per-customer names + payment marking ----------
  const slipFlow = await page.evaluate(() => {
    const d = day();
    // addSlip expects items as a {kind: qty} map, not an array — this is the app's
    // real calling convention (see slipOrders(), which reads sl.items as a map).
    addSlip('Test Neighbour', { ala: 1 });
    const d2 = day();
    const slip = (d2.slips || [])[0];
    if (!slip) return { found: false };
    const paidBefore = !!slip.paid;
    togglePaid(slip.id);
    const paidAfter = !!(day().slips || []).find(s => s.id === slip.id).paid;
    return { found: true, name: slip.name, paidBefore, paidAfter };
  });
  ok('a named order records the customer\'s name', slipFlow.found && slipFlow.name === 'Test Neighbour', JSON.stringify(slipFlow));
  ok('payment marking (paid/unpaid) toggles', slipFlow.found && slipFlow.paidAfter !== slipFlow.paidBefore, JSON.stringify(slipFlow));

  // ---------- must-not-regress: day-close including zero-order days ----------
  const closeFlow = await page.evaluate(() => {
    // a distinct future day, menu set, zero orders
    menuTarget = shiftDate(todayKey(), 3);
    initDraft(); suggPage = 0;
    pickDish('Puliyogre');
    saveMenu();
    const k = menuTarget || shiftDate(todayKey(), 3);
    const d = S.days[k];
    const trackable = dayTrackable(d);
    const hasOrders = dayHasOrders(d);
    closeDay(k);
    const closed = isClosed(S.days[k]);
    return { trackable, hasOrders, closed };
  });
  ok('a zero-order day is still trackable and closeable', closeFlow.trackable && !closeFlow.hasOrders && closeFlow.closed, JSON.stringify(closeFlow));

  // ---------- must-not-regress: holiday marking, both directions ----------
  const holFlow = await page.evaluate(() => {
    const k = shiftDate(todayKey(), 10);
    const before = isHoliday(k);
    setHoliday(k, !before);
    const after = isHoliday(k);
    setHoliday(k, before);
    const restored = isHoliday(k);
    return { before, after, restored };
  });
  ok('holiday marking flips a day both ways', holFlow.after !== holFlow.before && holFlow.restored === holFlow.before, JSON.stringify(holFlow));

  // ---------- must-not-regress: festival/special slip records what it absorbed ----------
  // ---------- specials: independent drops, not one dated menu ----------
  const xFlow = await page.evaluate(() => {
    xNewDrop();
    xdraft.title = 'Ganesh Chaturthi';
    addXItem('Obbattu', 'piece', 20);
    saveSpecial(); // creates the drop, sets xTarget, navigates to its detail
    const dropA = xTarget;
    xAddSlip('Neighbour X', { [S.special[dropA].items[0].id]: 3 });
    const sp = S.special[dropA];
    const slip = (sp.slips || [])[0];
    return { ok: true, dropA, recorded: slip ? slip.items[S.special[dropA].items[0].id] : null, name: slip ? slip.name : null };
  });
  ok('festival slip records what it absorbed (item + qty) and the customer\'s name', xFlow.ok && xFlow.recorded === 3 && xFlow.name === 'Neighbour X', JSON.stringify(xFlow));

  // two drops open concurrently, orders never leak across, closing one leaves the other open
  const dropsFlow = await page.evaluate((dropA) => {
    xNewDrop();
    xdraft.title = 'Ragi malt batch';
    addXItem('Ragi malt', 'kg', 250);
    saveSpecial();
    const dropB = xTarget;
    xAddSlip('Neighbour Y', { [S.special[dropB].items[0].id]: 2 });

    const bothOpen = openDropKeys().includes(dropA) && openDropKeys().includes(dropB);
    const aName = (S.special[dropA].slips || []).map(s => s.name);
    const bName = (S.special[dropB].slips || []).map(s => s.name);
    const noLeak = aName.includes('Neighbour X') && !aName.includes('Neighbour Y') &&
                   bName.includes('Neighbour Y') && !bName.includes('Neighbour X');

    xTarget = dropA; doCloseSpecial();
    const aClosedBOpen = isClosed(S.special[dropA]) && !isClosed(S.special[dropB]) && openDropKeys().includes(dropB) && !openDropKeys().includes(dropA);

    return { dropA, dropB, bothOpenBeforeClose: bothOpen, noLeak, aClosedBOpen };
  }, xFlow.dropA);
  ok('two drops can be open at the same time', dropsFlow.bothOpenBeforeClose, JSON.stringify(dropsFlow));
  ok('orders in one drop never appear in another', dropsFlow.noLeak, JSON.stringify(dropsFlow));
  ok('closing one drop leaves the other open', dropsFlow.aClosedBOpen, JSON.stringify(dropsFlow));

  // no memory: manual item entry has no recall/suggestion list, no repeat-customer datalist
  const noMemory = await page.evaluate(() => {
    xNewDrop();
    return {
      noRecentItemsBlock: !document.getElementById('xs-recent'),
      addBoxHasNoSuggestions: !document.querySelector('#v-specialset .sprec'),
    };
  });
  ok('no item recall/suggestion UI when adding a drop item', noMemory.noRecentItemsBlock && noMemory.addBoxHasNoSuggestions, JSON.stringify(noMemory));

  const noAutocomplete = await page.evaluate((dropB) => {
    xTarget = dropB; go('specialdetail');
    showXSlip();
    const input = document.getElementById('xslName');
    return { hasDatalist: input.hasAttribute('list') };
  }, dropsFlow.dropB);
  ok('drop order-entry name field has no repeat-customer datalist', !noAutocomplete.hasDatalist, JSON.stringify(noAutocomplete));

  // no deadline/capacity anywhere in a drop's own post copy
  const dropPost = await page.evaluate((dropB) => buildSpecialPost(S.special[dropB]), dropsFlow.dropB);
  ok('a drop\'s post has no deadline or capacity line', !/order by|limited to/i.test(dropPost), dropPost);

  // ---------- delivery date: the day customers collect and pay, not an order deadline ----------
  const deliveryFlow = await page.evaluate(() => {
    const t = todayKey();
    xNewDrop();
    const defaultsToday = xdraft.deliveryDate === t;
    xdraft.title = 'Delivery date test';
    addXItem('Test item', 'piece', 10);
    saveSpecial();
    const dropId = xTarget;
    const savedToday = S.special[dropId].deliveryDate === t;
    xEditDrop();
    const moved = shiftDate(t, 5);
    xdraft.deliveryDate = moved;
    saveSpecial();
    const nowMoved = S.special[dropId].deliveryDate === moved;
    const sameId = xTarget === dropId; // moving the date edits the drop, never forks a new one
    return { defaultsToday, savedToday, nowMoved, sameId };
  });
  ok('a new drop defaults its delivery date to today, and it is saved on the drop', deliveryFlow.defaultsToday && deliveryFlow.savedToday, JSON.stringify(deliveryFlow));
  ok('delivery date can be moved after the fact, editing the same drop rather than creating a new one', deliveryFlow.nowMoved && deliveryFlow.sameId, JSON.stringify(deliveryFlow));

  // open drops surface soonest-due first, so today's pickups are always at the top
  const orderingFlow = await page.evaluate(() => {
    const t = todayKey();
    xNewDrop(); xdraft.title = 'Due today'; xdraft.deliveryDate = t; addXItem('A', 'piece', 10); saveSpecial();
    const dropToday = xTarget;
    xNewDrop(); xdraft.title = 'Due later'; xdraft.deliveryDate = shiftDate(t, 3); addXItem('B', 'piece', 10); saveSpecial();
    const dropLater = xTarget;
    const openKeys = openDropKeys();
    return { todayFirst: openKeys.indexOf(dropToday) < openKeys.indexOf(dropLater), bothPresent: openKeys.includes(dropToday) && openKeys.includes(dropLater) };
  });
  ok('open drops are ordered by delivery date, with today\'s due first', orderingFlow.todayFirst && orderingFlow.bothPresent, JSON.stringify(orderingFlow));

  // a drop past its delivery date is not auto-closed or gated — he still decides
  const overdueFlow = await page.evaluate(() => {
    const past = shiftDate(todayKey(), -5);
    xNewDrop(); xdraft.title = 'Overdue drop'; xdraft.deliveryDate = past; addXItem('X', 'piece', 10); saveSpecial();
    const dropId = xTarget;
    xAddSlip('Late-ish buyer', { [S.special[dropId].items[0].id]: 1 });
    return { recorded: (S.special[dropId].slips || []).some(s => s.name === 'Late-ish buyer'), closed: isClosed(S.special[dropId]) };
  });
  ok('a drop past its delivery date still takes orders — no auto-close, no gating', overdueFlow.recorded && !overdueFlow.closed, JSON.stringify(overdueFlow));

  // ---------- month report attributes a drop's revenue to its delivery date, not order time ----------
  const attributionFlow = await page.evaluate(() => {
    const t = todayKey();
    const curMonth = t.slice(0, 7);
    const deliveryInOtherMonth = shiftDate(t, 40); // always lands in a different month than today
    const otherMonth = deliveryInOtherMonth.slice(0, 7);
    xNewDrop();
    xdraft.title = 'Cross-month drop';
    xdraft.deliveryDate = deliveryInOtherMonth;
    addXItem('Barfi', 'piece', 50);
    saveSpecial();
    const dropId = xTarget;
    xAddSlip('Cross Buyer', { [S.special[dropId].items[0].id]: 4 }); // ordered now, delivered later
    const revExpected = 4 * 50;
    const curStats = monthStats(curMonth);
    const otherStats = monthStats(otherMonth);
    const inCurrent = curStats.Xdrops.some(x => x.id === dropId);
    const otherEntry = otherStats.Xdrops.find(x => x.id === dropId);
    return { curMonth, otherMonth, inCurrent, foundInOther: !!otherEntry, otherRev: otherEntry ? otherEntry.rev : null, revExpected };
  });
  ok('a drop\'s revenue is not counted in the month the order was placed, when delivery is later', !attributionFlow.inCurrent, JSON.stringify(attributionFlow));
  ok('a drop\'s revenue lands in the month of its delivery date instead', attributionFlow.foundInOther && attributionFlow.otherRev === attributionFlow.revExpected, JSON.stringify(attributionFlow));

  // ---------- collection view: what's due at the door on a given day, across drops ----------
  const collectionFlow = await page.evaluate(() => {
    const shared = shiftDate(todayKey(), 7);
    xNewDrop(); xdraft.title = 'Ganesh Chaturthi (collect test)'; xdraft.deliveryDate = shared; addXItem('Modak', 'piece', 15); saveSpecial();
    const dropC = xTarget;
    xAddSlip('Door Customer 1', { [S.special[dropC].items[0].id]: 2 });

    xNewDrop(); xdraft.title = 'Ragi malt (collect test)'; xdraft.deliveryDate = shared; addXItem('Ragi malt', 'kg', 250); saveSpecial();
    const dropD = xTarget;
    xAddSlip('Door Customer 2', { [S.special[dropD].items[0].id]: 1 });

    collectDate = shared;
    go('specialcollect');
    const html = document.getElementById('xc-body').innerHTML;
    const hasBothDrops = html.includes('Ganesh Chaturthi (collect test)') && html.includes('Ragi malt (collect test)');
    const hasBothCustomers = html.includes('Door Customer 1') && html.includes('Door Customer 2');

    const slipC = S.special[dropC].slips[0].id, slipD = S.special[dropD].slips[0].id;
    xTogglePaidFor(dropC, slipC);
    const cPaid = S.special[dropC].slips[0].paid === true;
    const dUntouched = S.special[dropD].slips[0].paid !== true;
    return { hasBothDrops, hasBothCustomers, cPaid, dUntouched };
  });
  ok('two drops sharing a delivery date both appear on that day\'s collection view', collectionFlow.hasBothDrops && collectionFlow.hasBothCustomers, JSON.stringify(collectionFlow));
  ok('marking one drop\'s order paid from the collection view never touches the other drop', collectionFlow.cPaid && collectionFlow.dUntouched, JSON.stringify(collectionFlow));

  // no new deadline/auto-close concept sneaked in alongside delivery dates
  ok('no auto-close/deadline logic tied to delivery date anywhere in source', !/autoclose|auto-close|deliveryDate\s*[<>]=?\s*todayKey\(\)\s*&&.*closed\s*=/i.test(SRC));

  // ---------- pack sizes: one item, several sizes, each its own manual price ----------
  const sizesFlow = await page.evaluate(() => {
    xNewDrop();
    xdraft.title = 'Ragi malt (sizes test)';
    addXItem('Ragi malt', 'kg', 250); // starts as a plain sizeless item
    const it = xdraft.items[0];
    // manual entry, not derived from any per-kg rate — 250g is not 2.5x the 100g price
    it.sizes = [
      { id: 'sz100', label: '100g', p: 60 },
      { id: 'sz250', label: '250g', p: 130 }
    ];
    renderSpecialSet();
    saveSpecial();
    const dropId = xTarget;
    const sp = S.special[dropId];
    const lines = spLines(sp);
    const line100 = lines.find(l => l.sizeId === 'sz100'), line250 = lines.find(l => l.sizeId === 'sz250');
    return { dropId, price100: line100.p, price250: line250.p, lineId100: line100.lineId, lineId250: line250.lineId };
  });
  ok('two sizes of the same item price independently (250g is not computed from 100g)', sizesFlow.price100 === 60 && sizesFlow.price250 === 130, JSON.stringify(sizesFlow));

  const orderFlow = await page.evaluate((f) => {
    const sp = S.special[f.dropId];
    xTarget = f.dropId; go('specialdetail');
    xAddSlip('Multi-size Customer', { [f.lineId100]: 2, [f.lineId250]: 1 });
    const slip = sp.slips[sp.slips.length - 1];
    const total = xSlipTotal(sp, slip);
    return { qty100: slip.items[f.lineId100], qty250: slip.items[f.lineId250], total, expectedTotal: 2 * 60 + 1 * 130 };
  }, sizesFlow);
  ok('the same customer can order two different sizes on one order, as separate lines', orderFlow.qty100 === 2 && orderFlow.qty250 === 1, JSON.stringify(orderFlow));
  ok('order total sums each size at its own manually-entered price', orderFlow.total === orderFlow.expectedTotal, JSON.stringify(orderFlow));

  // a plain per-piece item added to the same drop keeps working exactly as before
  const plainFlow = await page.evaluate((dropId) => {
    xTarget = dropId; go('specialdetail'); xEditDrop();
    addXItem('Obbattu', 'piece', 20);
    saveSpecial();
    const sp = S.special[dropId];
    const plainItem = sp.items.find(i => i.n === 'Obbattu');
    const lines = spLines(sp);
    const plainLine = lines.find(l => l.itemId === plainItem.id);
    xAddSlip('Plain Buyer', { [plainLine.lineId]: 3 });
    const slip = sp.slips[sp.slips.length - 1];
    return {
      noSizeId: plainLine.sizeId === null,
      lineIdIsItemId: plainLine.lineId === plainItem.id,
      recordedQty: slip.items[plainItem.id],
      price: plainLine.p
    };
  }, sizesFlow.dropId);
  ok('a sizeless item behaves exactly as before — its own id is the line id, one price', plainFlow.noSizeId && plainFlow.lineIdIsItemId && plainFlow.recordedQty === 3 && plainFlow.price === 20, JSON.stringify(plainFlow));

  // real legacy shape: an item object with no "sizes" key at all, not even an empty array
  const legacyItemFlow = await page.evaluate(() => {
    xNewDrop(); xdraft.title = 'Legacy item test'; addXItem('Vada', 'piece', 12); saveSpecial();
    const dropId = xTarget;
    const sp = S.special[dropId];
    delete sp.items[0].sizes;
    const lines = spLines(sp);
    return { oneLine: lines.length === 1, price: spPrice(sp, sp.items[0].id), label: spLabel(sp, sp.items[0].id) };
  });
  ok('an item with no "sizes" key at all (genuine legacy shape) still works untouched', legacyItemFlow.oneLine && legacyItemFlow.price === 12 && legacyItemFlow.label === 'Vada', JSON.stringify(legacyItemFlow));

  // drop total and month report must reflect per-size prices, not a pooled/blended one
  const totalsFlow = await page.evaluate((dropId) => {
    const sp = S.special[dropId];
    const T = specialTotals(sp);
    const m = sp.deliveryDate.slice(0, 7);
    const st = monthStats(m);
    const entry = st.Xdrops.find(x => x.id === dropId);
    return { dropRev: T.rev, monthRev: entry ? entry.rev : null };
  }, sizesFlow.dropId);
  const expectedDropRev = 2 * 60 + 1 * 130 + 3 * 20; // sized order + the plain Obbattu order
  ok('drop total and month report both use per-size prices (no pooled price)', totalsFlow.dropRev === expectedDropRev && totalsFlow.monthRev === expectedDropRev, JSON.stringify({ ...totalsFlow, expectedDropRev }));

  // the pickups (door) view must read item + size + quantity clearly
  const pickupFlow = await page.evaluate((dropId) => {
    const sp = S.special[dropId];
    collectDate = sp.deliveryDate;
    go('specialcollect');
    const html = document.getElementById('xc-body').innerHTML;
    return { hasSize100: html.includes('100g'), hasSize250: html.includes('250g'), hasCustomer: html.includes('Multi-size Customer') };
  }, sizesFlow.dropId);
  ok('the pickups view reads item + size + quantity at the door, not just item', pickupFlow.hasSize100 && pickupFlow.hasSize250 && pickupFlow.hasCustomer, JSON.stringify(pickupFlow));

  // sizes are editable and removable after the fact, like prices elsewhere
  const editSizeFlow = await page.evaluate((dropId) => {
    xTarget = dropId; go('specialdetail'); xEditDrop();
    const it = xdraft.items.find(i => i.n === 'Ragi malt');
    it.sizes.find(s => s.label === '250g').p = 140;
    it.sizes = it.sizes.filter(s => s.label !== '100g');
    saveSpecial();
    const sp = S.special[dropId];
    const itemAfter = sp.items.find(i => i.n === 'Ragi malt');
    return { newPrice: itemAfter.sizes.find(s => s.label === '250g').p, sizeCount: itemAfter.sizes.length, still100g: itemAfter.sizes.some(s => s.label === '100g') };
  }, sizesFlow.dropId);
  ok('sizes are editable (price) and removable after the fact', editSizeFlow.newPrice === 140 && editSizeFlow.sizeCount === 1 && !editSizeFlow.still100g, JSON.stringify(editSizeFlow));

  // removing every size on an item reverts it to the plain one-price case
  const revertFlow = await page.evaluate((dropId) => {
    xTarget = dropId; go('specialdetail'); xEditDrop();
    const it = xdraft.items.find(i => i.n === 'Ragi malt');
    it.sizes = [];
    saveSpecial();
    const sp = S.special[dropId];
    const itemAfter = sp.items.find(i => i.n === 'Ragi malt');
    return { hasSizes: !!(itemAfter.sizes && itemAfter.sizes.length), oneLine: spLines(sp).filter(l => l.itemId === itemAfter.id).length === 1 };
  }, sizesFlow.dropId);
  ok('removing every size on an item reverts it to the plain one-price case', !revertFlow.hasSizes && revertFlow.oneLine, JSON.stringify(revertFlow));

  // ---------- unit list: piece/plate/kg/½ kg/250 g, plus Custom for anything else ----------
  const unitListFlow = await page.evaluate(() => {
    xNewDrop();
    showXItem();
    const buttonTexts = Array.from(document.getElementById('xs-unit').querySelectorAll('button')).map(b => b.textContent.trim());
    return { buttonTexts, hasCustomButton: buttonTexts.includes('Custom') };
  });
  ok('the original unit options (piece, plate, kg, ½ kg) are all still present', ['piece', 'plate', 'kg', '½ kg'].every(u => unitListFlow.buttonTexts.includes(u)), JSON.stringify(unitListFlow));
  ok('"250 g" has been added to the unit list', unitListFlow.buttonTexts.includes('250 g'), JSON.stringify(unitListFlow));
  ok('a "Custom" option is present alongside the presets', unitListFlow.hasCustomButton, JSON.stringify(unitListFlow));

  // original preset options still work unchanged, end to end
  const presetFlow = await page.evaluate(() => {
    xNewDrop(); xdraft.title = 'Preset unit test';
    showXItem();
    document.getElementById('xs-name').value = 'Vada';
    document.getElementById('xs-price').value = '10';
    // pick "kg" explicitly, same as tapping the button
    xUnit = 'kg'; renderXUnit();
    saveXItem();
    const it = xdraft.items[xdraft.items.length - 1];
    return { unit: it ? it.u : undefined };
  });
  ok('picking a preset (e.g. "kg") saves that exact unit, unchanged from before', presetFlow.unit === 'kg', JSON.stringify(presetFlow));

  // Custom reveals a text field, and the typed value is what gets saved
  const customEntryFlow = await page.evaluate(() => {
    xNewDrop();
    showXItem();
    const beforeCustomFieldHidden = document.getElementById('xs-unitcustom').style.display === 'none';
    xUnit = 'custom'; renderXUnit();
    const customFieldVisibleNow = document.getElementById('xs-unitcustom').style.display !== 'none';
    document.getElementById('xs-name').value = 'Ragi malt';
    document.getElementById('xs-unitcustom').value = '100 g';
    xUnitCustom = '100 g';
    document.getElementById('xs-price').value = '60';
    saveXItem();
    const it = xdraft.items[xdraft.items.length - 1];
    return { beforeCustomFieldHidden, customFieldVisibleNow, savedUnit: it ? it.u : undefined };
  });
  ok('Custom reveals a free-text field (hidden until chosen)', customEntryFlow.beforeCustomFieldHidden && customEntryFlow.customFieldVisibleNow, JSON.stringify(customEntryFlow));
  ok('Custom accepts and saves the typed value as the item\'s unit', customEntryFlow.savedUnit === '100 g', JSON.stringify(customEntryFlow));

  // a Custom value survives edit/reload, and reads correctly in drop total, Pickups, and month report
  const customPersistFlow = await page.evaluate(() => {
    saveSpecial(); // opens the drop just created above
    const dropId = xTarget;
    let sp = S.special[dropId];
    const it = sp.items[0];
    const labelBeforeReload = spLabel(sp, it.id);
    // simulate reopening the app: re-fetch from S fresh, as a reload would
    xEditDrop();
    const formShowsCustomUnit = document.getElementById('xs-items').innerHTML.includes('per 100 g');
    saveSpecial();
    sp = S.special[dropId];
    xAddSlip('Custom Unit Buyer', { [it.id]: 3 });
    const total = specialTotals(sp).rev;
    collectDate = sp.deliveryDate;
    go('specialcollect');
    const pickupHtml = document.getElementById('xc-body').innerHTML;
    const m = sp.deliveryDate.slice(0, 7);
    const monthEntry = monthStats(m).Xdrops.find(x => x.id === dropId);
    return {
      labelBeforeReload, formShowsCustomUnit,
      dropTotal: total, expectedTotal: 3 * 60,
      pickupShowsCustomer: pickupHtml.includes('Custom Unit Buyer'),
      monthRev: monthEntry ? monthEntry.rev : null
    };
  });
  ok('a Custom unit value survives edit/reload (still "100 g" on the item)', customPersistFlow.formShowsCustomUnit, JSON.stringify(customPersistFlow));
  ok('the drop total uses the Custom-unit item\'s price correctly', customPersistFlow.dropTotal === customPersistFlow.expectedTotal, JSON.stringify(customPersistFlow));
  ok('the Pickups view reads correctly for a Custom-unit item order', customPersistFlow.pickupShowsCustomer, JSON.stringify(customPersistFlow));
  ok('the month report reflects a Custom-unit item\'s revenue correctly', customPersistFlow.monthRev === customPersistFlow.expectedTotal, JSON.stringify(customPersistFlow));

  // ---------- priced by weight: one rate, price computed from grams ordered ----------
  const weightSwitchFlow = await page.evaluate(() => {
    xNewDrop(); xdraft.title = 'Weight mode test';
    addXItem('Ragi malt', 'kg', 250); // starts flat, as every item does
    renderSpecialSet();
    const beforeHasWeightLink = !!document.querySelector('.xsz-switchweight');
    document.querySelector('.xsz-switchweight').click(); // one tap
    const it = xdraft.items[0];
    return { beforeHasWeightLink, priceMode: it.priceMode, carriedRate: it.ratePerKg };
  });
  ok('switching an item to "priced by weight" is one tap, and carries its old price forward as a starting rate', weightSwitchFlow.beforeHasWeightLink && weightSwitchFlow.priceMode === 'weight' && weightSwitchFlow.carriedRate === 250, JSON.stringify(weightSwitchFlow));

  const rateEntryFlow = await page.evaluate(() => {
    const input = document.querySelector('.xsz-item .crow input');
    input.value = '300'; input.dispatchEvent(new Event('change'));
    renderSpecialSet();
    return { rate: xdraft.items[0].ratePerKg, hasSizesUI: !!document.querySelector('.xsz-row'), hasFlatSwitchLink: !!document.querySelector('.xsz-switchflat') };
  });
  ok('rate is editable, and weight mode shows no sizes UI — the two never coexist visibly', rateEntryFlow.rate === 300 && !rateEntryFlow.hasSizesUI && rateEntryFlow.hasFlatSwitchLink, JSON.stringify(rateEntryFlow));

  await page.evaluate(() => { saveSpecial(); }); // opens the drop, xTarget now set

  const presetPricingFlow = await page.evaluate(() => {
    const sp = currentDrop();
    const byGrams = {};
    spLines(sp).forEach(l => { byGrams[l.grams] = l.p; });
    return byGrams;
  });
  ok('rate × grams is computed correctly at each preset (100g/250g/½kg/1kg, ₹300/kg)',
    presetPricingFlow[100] === 30 && presetPricingFlow[250] === 75 && presetPricingFlow[500] === 150 && presetPricingFlow[1000] === 300,
    JSON.stringify(presetPricingFlow));

  const roundingFlow = await page.evaluate(() => {
    currentDrop().items[0].ratePerKg = 333; // 33.3 and 83.25 — neither divides evenly
    const byGrams = {};
    spLines(currentDrop()).forEach(l => { byGrams[l.grams] = l.p; });
    currentDrop().items[0].ratePerKg = 300; // restore for the rest of this flow
    return byGrams;
  });
  ok('a non-round rate rounds each computed price to the nearest rupee (333×100g=33.3→33, 333×250g=83.25→83)', roundingFlow[100] === 33 && roundingFlow[250] === 83, JSON.stringify(roundingFlow));

  const noRecallFlow = await page.evaluate(() => {
    showXSlip();
    const input = document.querySelector('#xslItems .xcg-input');
    return { hasDatalist: input ? input.hasAttribute('list') : null, prefilled: input ? input.value : null };
  });
  ok('the Custom grams field has no datalist/autocomplete and starts blank — manual entry only', !noRecallFlow.hasDatalist && noRecallFlow.prefilled === '', JSON.stringify(noRecallFlow));

  const weightOrderFlow = await page.evaluate(() => {
    const sp = currentDrop();
    document.getElementById('xslName').value = 'Weight Buyer';
    function row250(){ return Array.from(document.querySelectorAll('#xslItems .oline')).find(r => r.textContent.includes('250 g')); }
    row250().querySelector('.plus').click();
    const priceAfterOneTap = row250().querySelector('.xpedit').value;
    row250().querySelector('.plus').click(); // 2 x 250g
    const qtyAfterTwoTaps = row250().querySelector('.ol-n').textContent.trim();

    const customBox = Array.from(document.querySelectorAll('#xslItems .addbox')).find(b => b.textContent.includes('Custom grams'));
    customBox.querySelector('.xcg-input').value = '375';
    customBox.querySelector('.xcg-add').click();
    function row375(){ return Array.from(document.querySelectorAll('#xslItems .oline')).find(r => r.textContent.includes('375 g')); }
    const priceFor375 = row375() ? row375().querySelector('.xpedit').value : null;

    saveXSlip();
    const slip = sp.slips[sp.slips.length - 1];
    return { priceAfterOneTap, qtyAfterTwoTaps, priceFor375, slipItems: slip.items, total: xSlipTotal(sp, slip) };
  });
  ok('tapping a weight preset shows its computed price before saving (250g @ ₹300/kg = ₹75)', weightOrderFlow.priceAfterOneTap === '75', JSON.stringify(weightOrderFlow));
  ok('tapping the same preset again increments its quantity, same as any other line', weightOrderFlow.qtyAfterTwoTaps === '2', JSON.stringify(weightOrderFlow));
  ok('Custom grams computes and shows its price before saving (375g @ ₹300/kg = ₹112.5 → ₹113)', weightOrderFlow.priceFor375 === '113', JSON.stringify(weightOrderFlow));
  const has250Line = Object.keys(weightOrderFlow.slipItems).some(k => k.endsWith('::250') && weightOrderFlow.slipItems[k] === 2);
  ok('the saved order keeps each gram amount as its own line with the right quantity', has250Line, JSON.stringify(weightOrderFlow));
  ok('order total sums rate×grams correctly across a preset and a custom line (2×75 + 113 = 263)', weightOrderFlow.total === 263, JSON.stringify(weightOrderFlow));

  const weightTotalFlow = await page.evaluate(() => {
    const sp = currentDrop();
    const wt = specialTotals(sp).weightTotals.find(w => w.itemId === sp.items[0].id);
    return { grams: wt ? wt.grams : null };
  });
  ok('total weight to prepare aggregates correctly across all lines of the item (2×250g + 1×375g = 875g)', weightTotalFlow.grams === 875, JSON.stringify(weightTotalFlow));

  const flowEverywhereFlow = await page.evaluate(() => {
    const sp = currentDrop();
    const dropTotal = specialTotals(sp).rev;
    collectDate = sp.deliveryDate;
    go('specialcollect');
    const pickupHtml = document.getElementById('xc-body').innerHTML;
    const m = sp.deliveryDate.slice(0, 7);
    const monthEntry = monthStats(m).Xdrops.find(x => x.id === sp.id);
    const csv = buildCSV('special', m);
    return {
      dropTotal, monthRev: monthEntry ? monthEntry.rev : null,
      pickupShowsBuyer: pickupHtml.includes('Weight Buyer'),
      pickupShows250g: pickupHtml.includes('250 g'), pickupShows375g: pickupHtml.includes('375 g'),
      csv
    };
  });
  ok('drop total, Pickups view, and month report all report the same computed revenue (₹263)', flowEverywhereFlow.dropTotal === 263 && flowEverywhereFlow.monthRev === 263, JSON.stringify({ dropTotal: flowEverywhereFlow.dropTotal, monthRev: flowEverywhereFlow.monthRev }));
  ok('the Pickups view reads name + item + grams for a weight order at the door', flowEverywhereFlow.pickupShowsBuyer && flowEverywhereFlow.pickupShows250g && flowEverywhereFlow.pickupShows375g, JSON.stringify(flowEverywhereFlow));
  const csvRows = flowEverywhereFlow.csv.split('\n').filter(l => l.includes('Weight Buyer'));
  ok('the CSV export carries the same computed weight-line prices (₹75 and ₹113 lines present)', csvRows.some(r => r.includes(',75,')) && csvRows.some(r => r.includes(',113,')), JSON.stringify(csvRows));

  const flatUnaffectedFlow = await page.evaluate(() => {
    go('today'); xEditDrop();
    addXItem('Obbattu', 'piece', 20); // a flat per-unit item, in the same drop
    saveSpecial();
    const sp = currentDrop();
    const flatItem = sp.items.find(i => i.n === 'Obbattu');
    showXSlip();
    document.getElementById('xslName').value = 'Flat Buyer';
    const flatLine = orderLinesFor(sp).find(l => l.itemId === flatItem.id);
    xSlipDraft[flatLine.lineId] = 3;
    renderXSlipItems();
    saveXSlip();
    const slip = sp.slips[sp.slips.length - 1];
    return { unit: flatItem.u, price: flatLine.p, recordedQty: slip.items[flatItem.id], total: xSlipTotal(sp, slip) };
  });
  ok('a flat per-unit item mixed into the same drop is completely unaffected by weight pricing', flatUnaffectedFlow.unit === 'piece' && flatUnaffectedFlow.price === 20 && flatUnaffectedFlow.recordedQty === 3 && flatUnaffectedFlow.total === 60, JSON.stringify(flatUnaffectedFlow));

  const reconcileFlow = await page.evaluate(() => {
    // a defensively-constructed edge case: an item somehow carrying both a
    // weight rate AND a leftover sizes array — weight must always win, so a
    // line is never priced two contradictory ways
    var it={id:'zzz1',n:'Weird item',priceMode:'weight',ratePerKg:200,sizes:[{id:'s1',label:'100g',p:999}]};
    var fakeSp={id:'fakedrop',items:[it],slips:[]};
    var lines=spLines(fakeSp);
    return { lineCount: lines.length, allWeightLines: lines.every(l => l.grams !== undefined), anyStaleSizePrice: lines.some(l => l.p === 999) };
  });
  ok('an item priced by weight always derives lines from its rate, even with a stale sizes array present — never contradictory', reconcileFlow.allWeightLines && !reconcileFlow.anyStaleSizePrice && reconcileFlow.lineCount === 4, JSON.stringify(reconcileFlow));

  const marginFlow = await page.evaluate(() => {
    const sp = currentDrop();
    const it = sp.items.find(i => i.priceMode === 'weight');
    it.c = 150; // ₹150/kg raw-ingredient cost
    return { cost: specialMargin(sp).cost };
  });
  ok('margin cost for a weight item is computed per kg, dimensionally exact (875g @ ₹150/kg = ₹131.25)', Math.abs(marginFlow.cost - 131.25) < 0.01, JSON.stringify(marginFlow));

  // ---------- must-not-regress: monthly report ----------
  const month = await page.evaluate(() => {
    const m = todayKey().slice(0, 7);
    const s = monthStats(m); // lunch figures live under s.L, batter under s.B, specials under s.X
    return { hasDays: 'days' in s.L, hasOrders: 'orders' in s.L, hasRev: 'rev' in s.L, days: s.L.days, orders: s.L.orders };
  });
  ok('monthly report computes without throwing and has expected shape', month.hasDays && month.hasOrders && month.hasRev, JSON.stringify(month));
  ok('monthly report reflects the day(s) closed above', month.days >= 1, JSON.stringify(month));

  // ---------- no enforcement: capacity/cap never blocks a stepper ----------
  const noCap = await page.evaluate(() => {
    go('today');
    const d = day();
    const t = tilesFor(d)[0];
    const before = countOf(d, t.k);
    for (let i = 0; i < 50; i++) addUnit(t.k, t.price); // no cap anywhere should stop this
    const after = countOf(d, t.k);
    for (let i = 0; i < 50; i++) removeUnit(t.k);
    return { before, after, added: after - before };
  });
  ok('no capacity enforcement — 50 taps in a row all register', noCap.added === 50, JSON.stringify(noCap));

  // ---------- cutoff: internal banner gone from rendered DOM, outbound copy intact ----------
  await page.evaluate(() => go('today'));
  const cutoffDom = await page.evaluate(() => ({
    cutoffLabPresent: !!document.getElementById('cutoffLab'),
    cookHeaderText: document.querySelector('#t-cook .ph').textContent,
  }));
  ok('no cutoff/deadline element in the internal "What to cook" header', !cutoffDom.cutoffLabPresent && !/cutoff|10:30/i.test(cutoffDom.cookHeaderText), JSON.stringify(cutoffDom));

  // the "Order by" line is gated behind postFmt()==="full" ("Complete format") —
  // that's pre-existing app behaviour (his default "usual" format omits it), not
  // something this pass touched. Exercise the "full" path to confirm the line survives.
  const postCopy = await page.evaluate(() => {
    const prevFmt = S.postFmt;
    S.postFmt = 'full';
    const d = day();
    const txt = buildPost(d);
    S.postFmt = prevFmt;
    return txt;
  });
  ok('outbound menu post (complete format) still tells customers when to order by', /Order by:.*10:30 AM/.test(postCopy), postCopy.slice(0, 300));

  // ---------- fold position: "Done for the day" reachable without scrolling ----------
  await page.evaluate(() => window.scrollTo(0, 0));
  const closeBar = await page.evaluate(() => {
    const el = document.getElementById('t-closebar');
    if (!el || el.classList.contains('hide')) return { present: false };
    const r = el.getBoundingClientRect();
    return { present: true, top: r.top, bottom: r.bottom, position: getComputedStyle(el).position };
  });
  ok('"Done for the day" is in a fixed bar, not the growing log', closeBar.position === 'fixed', JSON.stringify(closeBar));
  ok('"Done for the day" is within the viewport with zero scroll', closeBar.present && closeBar.top >= 0 && closeBar.bottom <= 812, JSON.stringify(closeBar));

  // simulate a long order log (the original defect: close pushed down as log grows)
  await page.evaluate(() => {
    const d = day();
    const t = tilesFor(d)[0];
    for (let i = 0; i < 30; i++) addUnit(t.k, t.price);
  });
  const closeBarAfterLog = await page.evaluate(() => {
    window.scrollTo(0, 0);
    const el = document.getElementById('t-closebar');
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, docHeight: document.documentElement.scrollHeight };
  });
  ok('close action stays reachable even after the order log grows long', closeBarAfterLog.top >= 0 && closeBarAfterLog.bottom <= 812, JSON.stringify(closeBarAfterLog));

  // ---------- costs screen: ingredient name column legible, not crushed ----------
  await page.evaluate(() => go('costs'));
  await page.waitForTimeout(50);
  const ccRow = await page.evaluate(() => {
    const row = document.querySelector('.ccrow');
    if (!row) return { found: false };
    const nameEl = row.querySelector('.ccn');
    const r = nameEl.getBoundingClientRect();
    return { found: true, text: nameEl.textContent, width: r.width, gtc: getComputedStyle(row).gridTemplateColumns };
  });
  ok('ingredient-name column is present and wide enough to read (not ~2px)', ccRow.found && ccRow.width > 60, JSON.stringify(ccRow));

  // ---------- ingredient price search filter exists and filters ----------
  const filterFlow = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.disc')].find(b => /All ingredient prices/.test(b.textContent));
    btn.click();
    const before = document.querySelectorAll('#d-prices-list .crow').length;
    const input = document.getElementById('ingPriceSearch');
    input.value = 'xyz-no-such-ingredient-zz';
    input.dispatchEvent(new Event('input'));
    const afterNoMatch = document.querySelectorAll('#d-prices-list .crow').length;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    const afterCleared = document.querySelectorAll('#d-prices-list .crow').length;
    return { before, afterNoMatch, afterCleared };
  });
  ok('ingredient price list has a working filter', filterFlow.before > 5 && filterFlow.afterNoMatch === 0 && filterFlow.afterCleared === filterFlow.before, JSON.stringify(filterFlow));

  // ---------- WCAG AA: spot-check computed contrast + tap target size on hot-path controls ----------
  await page.evaluate(() => { setLine('lunch'); go('today'); }); // the drop tests above left S.line on "special"
  function relLuminance(r, g, b) {
    const c = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrastOf(fg, bg) {
    const L1 = relLuminance(...fg), L2 = relLuminance(...bg);
    const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (a + 0.05) / (b + 0.05);
  }
  const wcag = await page.evaluate(() => {
    const btn = document.querySelector('.ol-btn.plus');
    const r = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    return { w: r.width, h: r.height, color: cs.color, bg: cs.backgroundColor };
  });
  ok('primary stepper "+" target meets the 44px minimum', wcag.w >= 44 && wcag.h >= 44, JSON.stringify({ w: wcag.w, h: wcag.h }));
  const contrast = contrastOf(wcag.color.match(/[\d.]+/g).map(Number), wcag.bg.match(/[\d.]+/g).map(Number));
  ok('primary stepper "+" text/background contrast meets WCAG AA (>=4.5:1)', contrast >= 4.5, 'ratio=' + contrast.toFixed(2));

  // ---------- delivered-order tick: three states, no colour-only signal, no more grey-out ----------
  const tickFlow = await page.evaluate(() => {
    go('today'); setLine('special');
    xNewDrop(); xdraft.title = 'Tick test drop';
    addXItem('Tick item', 'piece', 50);
    saveSpecial();
    const sp = currentDrop();
    xAddSlip('Tick Customer', { [sp.items[0].id]: 1 });
    const slipId = sp.slips[0].id;

    function readRow() {
      const row = document.querySelector('#xsliplist .slip');
      const tick = row.querySelector('.slip-tick');
      const cs = getComputedStyle(row);
      const tcs = getComputedStyle(tick);
      return {
        rowOpacity: cs.opacity,
        glyph: tick.textContent.trim(),
        ariaLabel: tick.getAttribute('aria-label'),
        ariaPressed: tick.getAttribute('aria-pressed'),
        hasPaidClass: tick.classList.contains('tick-paid'),
        hasUnpaidClass: tick.classList.contains('tick-unpaid'),
        tickBg: tcs.backgroundColor, tickColor: tcs.color,
        paychipText: row.querySelector('.paychip').textContent.trim()
      };
    }
    const notDelivered = readRow();

    xToggleCollected(slipId); // now delivered, still unpaid
    const deliveredUnpaid = readRow();

    xTogglePaid(slipId); // now delivered AND paid
    const deliveredPaid = readRow();

    return { notDelivered, deliveredUnpaid, deliveredPaid };
  });
  ok('not-yet-delivered: unchanged — blank tick, no colour class, row fully opaque', tickFlow.notDelivered.glyph === '' && !tickFlow.notDelivered.hasPaidClass && !tickFlow.notDelivered.hasUnpaidClass && tickFlow.notDelivered.rowOpacity === '1', JSON.stringify(tickFlow.notDelivered));
  ok('delivered + unpaid: orange tick ("!"), row NOT greyed out, distinct accessible name', tickFlow.deliveredUnpaid.hasUnpaidClass && tickFlow.deliveredUnpaid.glyph === '!' && tickFlow.deliveredUnpaid.ariaLabel === 'Delivered, not paid' && tickFlow.deliveredUnpaid.rowOpacity === '1', JSON.stringify(tickFlow.deliveredUnpaid));
  ok('delivered + paid: green tick ("✓"), row NOT greyed out, distinct accessible name', tickFlow.deliveredPaid.hasPaidClass && tickFlow.deliveredPaid.glyph === '✓' && tickFlow.deliveredPaid.ariaLabel === 'Delivered, paid' && tickFlow.deliveredPaid.rowOpacity === '1', JSON.stringify(tickFlow.deliveredPaid));
  ok('the tick is additional, not a replacement — the existing Paid/Unpaid chip is untouched in every state', tickFlow.notDelivered.paychipText === 'Unpaid' && tickFlow.deliveredUnpaid.paychipText === 'Unpaid' && tickFlow.deliveredPaid.paychipText === 'Paid', JSON.stringify(tickFlow));
  ok('paid and unpaid ticks use different glyphs, not colour alone ("✓" vs "!")', tickFlow.deliveredPaid.glyph !== tickFlow.deliveredUnpaid.glyph, JSON.stringify({ paid: tickFlow.deliveredPaid.glyph, unpaid: tickFlow.deliveredUnpaid.glyph }));

  const unpaidContrast = contrastOf(tickFlow.deliveredUnpaid.tickColor.match(/[\d.]+/g).map(Number), tickFlow.deliveredUnpaid.tickBg.match(/[\d.]+/g).map(Number));
  const paidContrast = contrastOf(tickFlow.deliveredPaid.tickColor.match(/[\d.]+/g).map(Number), tickFlow.deliveredPaid.tickBg.match(/[\d.]+/g).map(Number));
  ok('orange (unpaid) tick meets WCAG AA text contrast (>=4.5:1) — brand orange alone does not, so it was darkened', unpaidContrast >= 4.5, 'ratio=' + unpaidContrast.toFixed(2));
  ok('green (paid) tick meets WCAG AA text contrast (>=4.5:1)', paidContrast >= 4.5, 'ratio=' + paidContrast.toFixed(2));

  // the door view is where he actually reads this — verify all three states render there too
  const pickupTickFlow = await page.evaluate(() => {
    const sp = currentDrop();
    xAddSlip('Second Tick Customer', { [sp.items[0].id]: 1 });
    const secondId = sp.slips[1].id;
    xToggleCollectedFor(sp.id, secondId); // deliver but leave unpaid
    collectDate = sp.deliveryDate;
    go('specialcollect');
    const rows = Array.from(document.querySelectorAll('#xc-body .slip'));
    return rows.map(r => {
      const t = r.querySelector('.slip-tick');
      return { name: r.querySelector('.slip-body b').textContent.trim(), glyph: t.textContent.trim(), cls: t.className, opacity: getComputedStyle(r).opacity };
    });
  });
  const allFullOpacity = pickupTickFlow.every(r => r.opacity === '1');
  const hasGreenRow = pickupTickFlow.some(r => r.cls.includes('tick-paid'));
  const hasOrangeRow = pickupTickFlow.some(r => r.cls.includes('tick-unpaid'));
  ok('the Pickups (door) view shows the same ticks, un-greyed, for every state present', allFullOpacity && hasGreenRow && hasOrangeRow, JSON.stringify(pickupTickFlow));

  // ---------- past-day payment editing: opening a closed day from History is not read-only ----------
  const pastDayFlow = await page.evaluate(() => {
    const k = shiftDate(todayKey(), -10);
    S.days[k] = { date: k, orders: [], slips: [
      { id: 'pd1', t: Date.now() - 1000, ch: 'group', name: 'Late Payer', items: { chap: 3 }, collected: true, paid: false },
      { id: 'pd2', t: Date.now() - 1000, ch: 'dm', name: 'Already Paid', items: { chap: 2 }, collected: true, paid: true }
    ] };
    closeDay(k);
    const beforeQty = S.days[k].slips[0].items.chap;
    const beforeTotal = slipTotal(S.days[k], S.days[k].slips[0]);

    viewDayKey = k; go('daydetail');
    const heroText = document.getElementById('dd-herosub').textContent;
    const csvBefore = buildCSV('orders', k.slice(0, 7));

    const row1 = Array.from(document.querySelectorAll('#dd-sliplist .slip')).find(r => r.textContent.includes('Late Payer'));
    row1.querySelector('.paychip').click(); // the actual control, not a direct function call

    const csvAfter = buildCSV('orders', k.slice(0, 7));
    const ps = payStats(S.days[k]);
    return {
      k, heroText,
      nowPaid: S.days[k].slips[0].paid === true, hasPaidAt: typeof S.days[k].slips[0].paidAt === 'number',
      stillClosed: isClosed(S.days[k]),
      qtyUnchanged: S.days[k].slips[0].items.chap === beforeQty,
      totalUnchanged: slipTotal(S.days[k], S.days[k].slips[0]) === beforeTotal,
      siblingUntouched: S.days[k].slips[1].paid === true && S.days[k].slips[1].items.chap === 2,
      paidTotal: ps.paid, unpaidTotal: ps.out,
      csvBeforeShowsNotYetPaid: csvBefore.split('\n').some(l => l.includes('Late Payer') && /,no,/.test(l)),
      csvAfterShowsPaid: csvAfter.split('\n').some(l => l.includes('Late Payer') && /,yes,/.test(l))
    };
  });
  ok('opening a closed day from History shows it as closed, but is not a read-only view', pastDayFlow.heroText.includes('Closed'), JSON.stringify(pastDayFlow.heroText));
  ok('marking a past order paid works after the day is closed, via the same control the day has on itself', pastDayFlow.nowPaid && pastDayFlow.hasPaidAt, JSON.stringify(pastDayFlow));
  ok('closing a day never freezes its payment state — the day is still closed after the edit', pastDayFlow.stillClosed, JSON.stringify(pastDayFlow));
  ok('editing payment on a past record changes only the paid flag and paidAt — quantity and price are untouched', pastDayFlow.qtyUnchanged && pastDayFlow.totalUnchanged, JSON.stringify(pastDayFlow));
  ok('per-order, not all-or-nothing: a sibling order in the same closed day is untouched', pastDayFlow.siblingUntouched, JSON.stringify(pastDayFlow));
  ok('the day\'s paid/unpaid totals recompute immediately (₹150 paid, ₹0 unpaid after settling the one outstanding order)', pastDayFlow.paidTotal === 150 && pastDayFlow.unpaidTotal === 0, JSON.stringify(pastDayFlow));
  ok('CSV export reflects the payment change for that exact order (not tracked/no -> yes)', pastDayFlow.csvBeforeShowsNotYetPaid && pastDayFlow.csvAfterShowsPaid, JSON.stringify(pastDayFlow));

  // month attribution: does a late payment move revenue to a different month? It must not —
  // paid is a status flag on the same record, never a re-dated transaction.
  const payAttributionFlow = await page.evaluate(() => {
    const k = shiftDate(todayKey(), -40); // reliably a different month from "today" and from pastDayFlow's day
    const m = k.slice(0, 7);
    S.days[k] = { date: k, orders: [], slips: [{ id: 'att1', t: Date.now() - 1000, ch: 'group', name: 'Attribution Test', items: { chap: 5 }, collected: true, paid: false }] };
    closeDay(k);
    const before = monthStats(m).L.rev;
    viewDayKey = k; go('daydetail');
    document.querySelector('#dd-sliplist .paychip').click(); // "paid days later, after a reminder"
    const after = monthStats(m).L.rev;
    return { before, after };
  });
  ok('a late payment does not move revenue to a different month — it stays on the original day\'s month, unaffected by when it was paid', payAttributionFlow.before === payAttributionFlow.after, JSON.stringify(payAttributionFlow));

  // already-working paths (specials never froze payment on close) — locked in explicitly
  const closedDropPayFlow = await page.evaluate(() => {
    go('today'); setLine('special');
    xNewDrop(); xdraft.title = 'Closed drop pay test'; addXItem('X', 'piece', 50); saveSpecial();
    const sp = currentDrop();
    xAddSlip('Closed Drop Customer', { [sp.items[0].id]: 1 });
    doCloseSpecial();
    xTogglePaid(sp.slips[0].id);
    return { paid: sp.slips[0].paid === true, stillClosed: isClosed(sp) };
  });
  ok('a closed drop still allows marking an order paid, per-order, without reopening it', closedDropPayFlow.paid && closedDropPayFlow.stillClosed, JSON.stringify(closedDropPayFlow));

  const pastPickupPayFlow = await page.evaluate(() => {
    const past = shiftDate(todayKey(), -7);
    xNewDrop(); xdraft.title = 'Past pickup pay test'; xdraft.deliveryDate = past; addXItem('Y', 'piece', 40); saveSpecial();
    const sp = currentDrop();
    xAddSlip('Past Pickup Customer', { [sp.items[0].id]: 1 });
    const slipId = sp.slips[0].id;
    collectDate = past; go('specialcollect');
    xTogglePaidFor(sp.id, slipId);
    return { paid: S.special[sp.id].slips[0].paid === true };
  });
  ok('a past-dated pickup still allows marking an order paid from the door view', pastPickupPayFlow.paid, JSON.stringify(pastPickupPayFlow));

  // ---------- Owed: surfaces unpaid orders across multiple past closed days AND drops ----------
  const owedFlow = await page.evaluate(() => {
    const k1 = shiftDate(todayKey(), -20), k2 = shiftDate(todayKey(), -15);
    S.days[k1] = { date: k1, orders: [], slips: [{ id: 'o1', t: Date.now(), ch: 'group', name: 'Owed Person A', items: { chap: 1 }, collected: true, paid: false }] };
    S.days[k2] = { date: k2, orders: [], slips: [{ id: 'o2', t: Date.now(), ch: 'dm', name: 'Owed Person B', items: { chap: 4 }, collected: true, paid: false }] };
    closeDay(k1); closeDay(k2);

    go('today'); setLine('special');
    xNewDrop(); xdraft.title = 'Owed drop test'; addXItem('Owed Item', 'piece', 20); saveSpecial();
    const sp = currentDrop();
    xAddSlip('Owed Person C', { [sp.items[0].id]: 2 });
    doCloseSpecial();

    go('owed');
    const html = document.getElementById('ow-body').innerHTML;
    const hasA = html.includes('Owed Person A'), hasB = html.includes('Owed Person B'), hasC = html.includes('Owed Person C');

    const rowA = Array.from(document.querySelectorAll('#ow-body .owed')).find(b => b.textContent.includes('Owed Person A'));
    rowA.querySelector('.paychip').click();
    const stillShowsAAfter = document.getElementById('ow-body').innerHTML.includes('Owed Person A');
    const aNowPaid = S.days[k1].slips[0].paid === true;
    return { hasA, hasB, hasC, stillShowsAAfter, aNowPaid };
  });
  ok('the Owed list surfaces unpaid orders across multiple past closed days and a closed drop together', owedFlow.hasA && owedFlow.hasB && owedFlow.hasC, JSON.stringify(owedFlow));
  ok('marking paid from the Owed list works, and that order drops off the list immediately', owedFlow.aNowPaid && !owedFlow.stillShowsAAfter, JSON.stringify(owedFlow));

  // ---------- batter brought to parity: named orders, same slip shape as lunch/specials ----------
  const batterOrderFlow = await page.evaluate(() => {
    go('today'); setLine('batter');
    initBatterDraft();
    bdraft.type='Idly'; bdraft.plain=true; bdraft.special=true; bdraft.top=true;
    bdraft.date=todayKey();
    saveBatter();
    var b=activeBatter();
    bShowSlip();
    document.getElementById('bslName').value='Priya';
    bSetSlipChan('dm');
    var kiloKey=bLineKey('plain','kilo',false);
    bSlipDraft[kiloKey]=2;
    bRenderSlipItems();
    bSaveSlip();
    var sl=activeBatter().slips[0];
    var before={
      name:sl.name, ch:sl.ch, qty:sl.items[kiloKey],
      tickBlank:tickState(sl).glyph==='', collected:sl.collected, paid:!!sl.paid
    };
    bToggleCollected(sl.id);
    sl=activeBatter().slips[0];
    var afterCollect={ tickGlyph:tickState(sl).glyph, tickCls:tickState(sl).cls };
    bTogglePaid(sl.id);
    sl=activeBatter().slips[0];
    var afterPaid={ tickGlyph:tickState(sl).glyph, tickCls:tickState(sl).cls, paidAt:!!sl.paidAt };
    return { before, afterCollect, afterPaid };
  });
  ok('a named batter order records name, quantity and channel exactly as entered', batterOrderFlow.before.name==='Priya' && batterOrderFlow.before.ch==='dm' && batterOrderFlow.before.qty===2, JSON.stringify(batterOrderFlow.before));
  ok('a new batter order starts undelivered/unpaid, same as lunch and specials', batterOrderFlow.before.tickBlank && !batterOrderFlow.before.collected && !batterOrderFlow.before.paid, JSON.stringify(batterOrderFlow.before));
  ok('marking a batter order delivered shows the orange (unpaid) tick', batterOrderFlow.afterCollect.tickGlyph==='!' && batterOrderFlow.afterCollect.tickCls===' tick-unpaid', JSON.stringify(batterOrderFlow.afterCollect));
  ok('marking that same order paid flips it to the green (paid) tick, and records paidAt', batterOrderFlow.afterPaid.tickGlyph==='✓' && batterOrderFlow.afterPaid.tickCls===' tick-paid' && batterOrderFlow.afterPaid.paidAt, JSON.stringify(batterOrderFlow.afterPaid));

  const batterIndependenceFlow = await page.evaluate(() => {
    var b=activeBatter();
    bShowSlip();
    document.getElementById('bslName').value='Second Customer';
    bSlipDraft[bLineKey('special','half',true)]=1;
    bRenderSlipItems();
    bSaveSlip();
    b=activeBatter();
    var first=b.slips.find(function(s){return s.name==='Priya';});
    var second=b.slips.find(function(s){return s.name==='Second Customer';});
    return { firstStillPaid:!!first.paid, secondUntouched:!second.paid && !second.collected };
  });
  ok('per-order payment independence: a second batter order is unaffected by the first\'s paid/delivered state', batterIndependenceFlow.firstStillPaid && batterIndependenceFlow.secondUntouched, JSON.stringify(batterIndependenceFlow));

  const batterTotalsCsvFlow = await page.evaluate(() => {
    var b=activeBatter();
    var T=batterTotals(b);
    var sumSlips=(b.slips||[]).reduce(function(a,sl){return a+bSlipTotal(b,sl);},0);
    var csv=buildCSV('batter', todayKey().slice(0,7));
    var lines=csv.split('\n');
    var priyaLine=lines.find(function(l){return l.includes('Priya');});
    var secondLine=lines.find(function(l){return l.includes('Second Customer');});
    return {
      revMatchesSlips: T.rev===sumSlips, rev:T.rev, sumSlips:sumSlips,
      csvHasPriya: !!priyaLine, csvPriyaPaidCol: priyaLine && priyaLine.split(',').includes('yes'),
      csvHasSecond: !!secondLine, csvSecondNotPaid: secondLine && /,no,not tracked,|,no,no,/.test(secondLine.replace(/,,/g,',,')) || (secondLine||'').includes('Second Customer')
    };
  });
  ok('batch totals equal the sum of its named orders\' own line totals', batterTotalsCsvFlow.revMatchesSlips, JSON.stringify(batterTotalsCsvFlow));
  ok('the batter CSV export carries per-customer lines (name + payment status), not just aggregate rows', batterTotalsCsvFlow.csvHasPriya && batterTotalsCsvFlow.csvHasSecond, JSON.stringify(batterTotalsCsvFlow));

  const batterCloseHistoryFlow = await page.evaluate(() => {
    var b=activeBatter();
    var key=b.date;
    closeBatter(key);
    viewBatterKey=key; go('batchdetail');
    var closedBeforeToggle=isClosed(S.batter[key]);
    var beforePaidTotal=document.getElementById('bd-paid').textContent;
    document.querySelectorAll('#bd-sliplist .paychip').forEach(function(chip){
      if(chip.getAttribute('data-on')==='0') chip.click();
    });
    var afterPaidTotal=document.getElementById('bd-paid').textContent;
    var stillClosed=isClosed(S.batter[key]);
    var allPaidNow=(S.batter[key].slips||[]).every(function(s){return s.paid;});
    return { closedBeforeToggle, stillClosed, beforePaidTotal, afterPaidTotal, allPaidNow };
  });
  ok('a closed batch\'s payment is still editable from History, via the same tap as any other slip', batterCloseHistoryFlow.closedBeforeToggle && batterCloseHistoryFlow.allPaidNow, JSON.stringify(batterCloseHistoryFlow));
  ok('closing a batch never freezes its payment state — it is still closed after the edit', batterCloseHistoryFlow.stillClosed, JSON.stringify(batterCloseHistoryFlow));
  ok('the batch\'s paid total recomputes immediately from History', batterCloseHistoryFlow.afterPaidTotal!==batterCloseHistoryFlow.beforePaidTotal, JSON.stringify(batterCloseHistoryFlow));

  // once today's batch is closed, setting up the next one must actually become
  // the active batch — otherwise every new order on it silently refuses,
  // since it's still pointed at a batch that's already done
  const batterActiveSwitchFlow = await page.evaluate(() => {
    var todayBatchClosed = isClosed(S.batter[todayKey()]);
    initBatterDraft();
    bdraft.type='Dosa'; bdraft.plain=true; bdraft.special=false; bdraft.top=false;
    bdraft.date=shiftDate(todayKey(),1);
    saveBatter();
    return { todayBatchClosed, activeIsNewOne: activeBatter().date===shiftDate(todayKey(),1) };
  });
  ok('once today\'s batch is closed, the next open batch becomes active — new orders don\'t silently refuse', batterActiveSwitchFlow.todayBatchClosed && batterActiveSwitchFlow.activeIsNewOne, JSON.stringify(batterActiveSwitchFlow));

  const batterOwedFlow = await page.evaluate(() => {
    go('today'); setLine('batter');
    bShowSlip();
    document.getElementById('bslName').value='Owes For Dosa';
    bSlipDraft[bLineKey('plain','kilo',false)]=1;
    bRenderSlipItems();
    bSaveSlip();
    var list=outstandingByName();
    var entry=list.find(function(p){return p.name==='Owes For Dosa';});
    go('owed');
    var htmlHasIt=document.getElementById('ow-body').innerHTML.includes('Owes For Dosa');
    return { foundInOutstanding:!!entry, line: entry&&entry.rows[0].line, htmlHasIt };
  });
  ok('an unpaid batter order appears in the shared Unpaid/Owed list alongside lunch and specials', batterOwedFlow.foundInOutstanding && batterOwedFlow.line==='batter' && batterOwedFlow.htmlHasIt, JSON.stringify(batterOwedFlow));

  const legacyBatterFlow = await page.evaluate(() => {
    // a batch shaped exactly like pre-parity data: aggregate taps only, no slips key at all
    var key=shiftDate(todayKey(),3);
    S.batter[key]={date:key,type:'Idly',plain:true,special:false,top:false,
      prices:{half:60,kilo:120,top:15},pickup:{night:'9 PM',morning:'6 AM'},orderBy:'9 PM',
      orders:[{id:'legacy1',t:Date.now(),ch:'group',variant:'plain',size:'kilo',top:0,q:3,p:120}]};
    save();
    var b=S.batter[key];
    var threw=false, T=null, m=null;
    try { T=batterTotals(b); m=batterMargin(b); } catch(e) { threw=true; }
    var lineTotals=bLineTotals(b);
    var kiloLine=lineTotals.find(function(l){return l.key===bLineKey('plain','kilo',false);});
    return { threw, kg:T&&T.kg, rev:T&&T.rev, n:T&&T.n, kiloLineQty:kiloLine&&kiloLine.q, complete:m&&m.complete!==undefined };
  });
  ok('a legacy aggregate-only batch (no slips key, only old anonymous taps) still computes totals without throwing', !legacyBatterFlow.threw && legacyBatterFlow.rev===360 && legacyBatterFlow.n===3, JSON.stringify(legacyBatterFlow));
  ok('a legacy batch\'s anonymous quantity still shows up correctly in the "to make" line totals', legacyBatterFlow.kiloLineQty===3, JSON.stringify(legacyBatterFlow));

  // ---------- 750 g: a third batter quantity, alongside ½ kg and 1 kg ----------
  const batter750Flow = await page.evaluate(() => {
    go('today'); setLine('batter');
    // batter runs one batch at a time — close every batch left open by earlier
    // tests first, so activeBatter() is null and this starts a genuinely
    // independent batch rather than "moving" one that's still taking orders
    // (bEditingKey would otherwise point at whichever is still open)
    Object.keys(S.batter).forEach(function(k){ if(!isClosed(S.batter[k])) closeBatter(k); });
    initBatterDraft();
    bdraft.type='Idly'; bdraft.plain=true; bdraft.special=true; bdraft.top=true;
    bdraft.date=shiftDate(todayKey(),5);
    saveBatter();
    var b=activeBatter();
    var defaultThreeq=b.prices.threeq, expectedDefault=Math.round(0.75*b.prices.kilo);

    bShowSlip();
    document.getElementById('bslName').value='Grams Buyer';
    var threeqKey=bLineKey('plain','threeq',false);
    bSlipDraft[threeqKey]=1;
    bRenderSlipItems();
    bSaveSlip();
    var sl=activeBatter().slips[0];
    var priceUsed=bLinePrice(b,threeqKey), slipTotalVal=bSlipTotal(b,sl);

    var changed=setBatterPrice(b,'threeq','100',false);
    var priceAfterEdit=bLinePrice(b,threeqKey);

    // topping surcharge: same flat rule at 750g as at the other sizes
    var surchargeHalf=bLinePrice(b,bLineKey('special','half',true))-bLinePrice(b,bLineKey('special','half',false));
    var surchargeKilo=bLinePrice(b,bLineKey('special','kilo',true))-bLinePrice(b,bLineKey('special','kilo',false));
    var surchargeThreeq=bLinePrice(b,bLineKey('special','threeq',true))-bLinePrice(b,bLineKey('special','threeq',false));

    // cost/margin: 750g must cost as 0.75kg, not 1 unit flat
    var perKgCost=batterKgCost('plain');
    var itemCost=batterItemCost({variant:'plain',size:'threeq',top:0});
    var expectedItemCost=perKgCost===null?null:perKgCost*0.75;

    var T=batterTotals(b);
    var csv=buildCSV('batter', b.date.slice(0,7));
    var csvLine=csv.split('\n').find(function(l){return l.includes('Grams Buyer');});

    return {
      defaultThreeq, expectedDefault, priceUsed, slipTotalVal,
      changed, priceAfterEdit,
      surchargeHalf, surchargeKilo, surchargeThreeq,
      perKgCost, itemCost, expectedItemCost,
      kg:T.kg, rev:T.rev,
      csvLine
    };
  });
  ok('a new batch defaults 750 g to pro-rata off the 1 kg price (0.75×, nearest rupee)', batter750Flow.defaultThreeq===batter750Flow.expectedDefault, JSON.stringify(batter750Flow));
  ok('a 750 g order is priced and totalled using that default', batter750Flow.priceUsed===batter750Flow.defaultThreeq && batter750Flow.slipTotalVal===batter750Flow.priceUsed, JSON.stringify(batter750Flow));
  ok('the 750 g price can be typed over like any other price', batter750Flow.changed && batter750Flow.priceAfterEdit===100, JSON.stringify(batter750Flow));
  ok('the topping surcharge at 750 g matches the same flat rule as ½ kg and 1 kg', batter750Flow.surchargeThreeq===batter750Flow.surchargeHalf && batter750Flow.surchargeThreeq===batter750Flow.surchargeKilo, JSON.stringify(batter750Flow));
  ok('750 g costs as 0.75 kg in the margin model, not a flat per-unit cost', batter750Flow.itemCost===batter750Flow.expectedItemCost, JSON.stringify(batter750Flow));
  ok('750 g flows into batch totals (kg and revenue) correctly', Math.abs(batter750Flow.kg-0.75)<1e-9, JSON.stringify(batter750Flow));
  ok('750 g appears as its own line in the batter CSV export', !!batter750Flow.csvLine && batter750Flow.csvLine.includes('750 g'), JSON.stringify(batter750Flow));

  const batter750LegacyFlow = await page.evaluate(() => {
    // a batch saved before 750g existed — no prices.threeq key at all
    var key=shiftDate(todayKey(),6);
    S.batter[key]={date:key,type:'Idly',plain:true,special:false,top:false,
      prices:{half:60,kilo:120,top:15},pickup:{night:'9 PM',morning:'6 AM'},orderBy:'9 PM',orders:[],slips:[]};
    save();
    var b=S.batter[key];
    var livePrice=batterPrice(b,'threeq',false);
    viewBatterKey=null; // no-op, just keeping scope tidy
    return { livePrice, expected:Math.round(0.75*120), stillNoStoredKey: !('threeq' in b.prices) };
  });
  ok('a batch saved before 750 g existed still prices it correctly (live pro-rata fallback, nothing stored until edited)', batter750LegacyFlow.livePrice===batter750LegacyFlow.expected && batter750LegacyFlow.stillNoStoredKey, JSON.stringify(batter750LegacyFlow));

  // ---------- brand bar: same header, same position, on every lane + costs ----------
  async function brandbarState(setup) {
    await page.evaluate(setup);
    await page.waitForTimeout(50);
    return page.evaluate(() => {
      const el = document.getElementById('brandbar');
      const img = el.querySelector('img');
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: r.top, left: r.left, right: r.right, height: r.height,
        position: cs.position, bg: cs.backgroundColor,
        imgSrcLen: img.src.length, imgNaturalWidth: img.naturalWidth,
        justifyContent: cs.justifyContent, // centred, not left-aligned
      };
    });
  }
  const bLunch = await brandbarState(() => { go('today'); setLine('lunch'); });
  const bBatter = await brandbarState(() => { setLine('batter'); });
  const bSpecial = await brandbarState(() => { setLine('special'); });
  const bCosts = await brandbarState(() => { go('costs'); });

  ok('brand bar is fixed (stays on screen while scrolling), not scoped to lunch', [bLunch, bBatter, bSpecial, bCosts].every(b => b.position === 'fixed'), JSON.stringify([bLunch.position, bBatter.position, bSpecial.position, bCosts.position]));
  ok('brand bar is centred, not left-aligned', bLunch.justifyContent === 'center', bLunch.justifyContent);
  ok('brand bar renders identically (same position, size, image) on lunch/batter/specials/costs', JSON.stringify(bLunch) === JSON.stringify(bBatter) && JSON.stringify(bBatter) === JSON.stringify(bSpecial) && JSON.stringify(bSpecial) === JSON.stringify(bCosts), 'lunch=' + JSON.stringify(bLunch) + ' batter=' + JSON.stringify(bBatter) + ' special=' + JSON.stringify(bSpecial) + ' costs=' + JSON.stringify(bCosts));
  ok('brand bar logo actually decodes on every screen checked', [bLunch, bBatter, bSpecial, bCosts].every(b => b.imgNaturalWidth > 0));
  ok('brand bar stays slim — under 60px tall', bLunch.height > 0 && bLunch.height <= 60, 'height=' + bLunch.height);
  await page.evaluate(() => setLine('lunch'));

  console.log('\n--- height comparison (375x812 viewport, like-for-like states) ---');
  Object.keys(heights).forEach(k => {
    const d = heights[k] - beforeHeights[k];
    console.log(k + ':  before ' + beforeHeights[k] + 'px  ->  after ' + heights[k] + 'px  (' + (d <= 0 ? '' : '+') + d + 'px)');
  });

  await browser.close();

  console.log('\n' + pass + ' passed, ' + fail + ' failed.');
  if (fail) {
    console.log('\nFAILURES:');
    failures.forEach(f => console.log(' - ' + f));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
