// South Savory v2 — flow checks against user-flows-v2.md, in real Chromium at 375x812.
// Every money figure asserted here is worked out by hand in the comment beside it.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const URL = 'http://localhost:8899/site/public/index.html';
const SHOTS = path.join(ROOT, 'screenshots/v2');
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0; const failures = [];
function ok(name, cond, detail) {
  if (cond) pass++; else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (!cond && detail ? '  (' + detail + ')' : ''));
}
const shot = async (page, name) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
const ev = (page, fn, arg) => page.evaluate(fn, arg);

async function fresh(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: opts.dark ? 'dark' : 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (opts.time) await page.clock.setFixedTime(new Date(opts.time));
  await page.goto(URL + '#/');
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL + '#/'); await page.reload();
  return { ctx, page, errors };
}
const menuId = (page, kind, name) => ev(page, ([k, n]) => S.menus[k].filter(i => i.name === n)[0].id, [kind, name]);

async function lunchFlow(browser) {
  const { ctx, page, errors } = await fresh(browser, { time: '2026-10-24T09:00:00' }); // Saturday
  await shot(page, '01-home-empty');
  ok('home shows four tiles', (await page.locator('.tile').count()) === 4);
  ok('seed: lunch list has groups incl. Chapathi', await ev(page, () => S.menus.lunch.some(i => i.group === 'Chapathi' && i.name === 'Chapathi' && i.price === 30)));
  ok('seed: unsourced dish prices are blank, not invented', await ev(page, () => S.menus.lunch.filter(i => i.name === 'Bisibelebath')[0].price === null));
  ok('seed: tier price kept (Tomato Rasam ₹50)', await ev(page, () => S.menus.lunch.filter(i => i.name === 'Tomato Rasam')[0].price === 50));

  await page.click('a.tile[href="#/lunch"]');
  await shot(page, '02-lunch-no-menu');
  const dock = await page.locator('.dock .btn.primary').boundingBox();
  ok('primary action above the fold', dock && dock.y + dock.height <= 812 - 56, JSON.stringify(dock));
  await page.click('.dock .btn.primary');
  for (const n of ['Tomato Rasam', 'Rice', 'Ragi ball', 'Beans Bele Palya', 'Chapathi']) {
    const id = await menuId(page, 'lunch', n);
    await page.check(`input[type=checkbox][onchange*="${id}"]`);
  }
  // Beans Bele Palya has no price yet; give it one for this day only
  const beans = await menuId(page, 'lunch', 'Beans Bele Palya');
  await page.fill(`input[oninput*="draft.price['${beans}']"]`, '75');
  await page.click('text=Add a combo');
  await page.fill('input[aria-label="Combo price"]', '120');
  for (const n of ['Rice', 'Tomato Rasam', 'Beans Bele Palya']) {
    const id = await menuId(page, 'lunch', n);
    await page.check(`input[onchange^="comboDish(0,'${id}'"]`);
  }
  await page.fill('input.search', 'rasam');
  { const vis = await page.locator('.sgroup .pick[data-name]:visible').count(); ok('dish search narrows the list', vis > 0 && vis < 10, String(vis)); }
  await page.fill('input.search', '');
  await shot(page, '03-lunch-setup');
  await page.click('.dock .btn.primary');
  ok('day price stays on the day, not the list', await ev(page, (id) => S.menus.lunch.filter(i => i.id === id)[0].price === null, beans));

  // order 1: Priya, Combo 1 x1 + Chapathi x2 = 120 + 2*30 = 180
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'Priya');
  const combo = await ev(page, () => Object.values(S.events)[0].combos[0].id);
  await page.click(`button[onclick="odStep('combo:${combo}',1)"]`);
  const chap = await menuId(page, 'lunch', 'Chapathi');
  await page.click(`button[onclick="odStep('${chap}',1)"]`);
  await page.click(`button[onclick="odStep('${chap}',1)"]`);
  await shot(page, '04-order-sheet-lunch');
  ok('sheet total 180', (await page.textContent('#odTot')).includes('180'));
  await page.click('#odSave');
  // order 2: Ramesh, Ragi ball x2 = 80, group
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'Ramesh');
  await page.click('.sheet .seg >> text=Group');
  const ragi = await menuId(page, 'lunch', 'Ragi ball');
  await page.click(`button[onclick="odStep('${ragi}',1)"]`);
  await page.click(`button[onclick="odStep('${ragi}',1)"]`);
  await page.click('#odSave');
  await page.waitForTimeout(300);
  const counts = await ev(page, () => { const e = Object.values(S.events)[0]; const o = {}; kitchenCount(e).forEach(c => o[c.it.name] = c.q); return o; });
  ok('kitchen count opens combos into dishes', counts['Rice'] === 1 && counts['Tomato Rasam'] === 1 && counts['Beans Bele Palya'] === 1 && counts['Ragi ball'] === 2 && counts['Chapathi'] === 2, JSON.stringify(counts));
  const st = await ev(page, () => eventStats(Object.values(S.events)[0]));
  ok('day total 260 (180 + 80)', st.total === 260, JSON.stringify(st));
  const what = await page.locator('.order .what').first().textContent();
  ok('delivery list never says "Combo"', !/combo/i.test(what), what);
  await page.locator('.order', { hasText: 'Priya' }).locator('text=Hand over').click();
  ok('a handed-over order moves out of "To hand over"', (await page.locator('.section', { hasText: 'Handed over, not paid' }).locator('.order', { hasText: 'Priya' }).count()) === 1);
  ok('the still-to-hand-over box shows what is left', (await page.textContent('.leftbox')).includes('1 order'));
  ok('the status strip says how much to cook', (await page.textContent('.strip')).includes('To cook') && (await page.textContent('.strip')).includes('portions'));
  await page.locator('.order', { hasText: 'Priya' }).locator('text=Unpaid').click();
  ok('handed over and paid goes to Done', (await page.locator('.section', { hasText: 'Done' }).locator('.order', { hasText: 'Priya' }).count()) === 1);
  await shot(page, '05-lunch-day-orders');
  const st2 = await ev(page, () => eventStats(Object.values(S.events)[0]));
  ok('paid 180 / unpaid 80', st2.paid === 180 && st2.unpaid === 80, JSON.stringify(st2));

  // done for the day is soft: summary shows, orders can still be added
  await page.click('.dock >> text=Done for the day');
  await shot(page, '06-done-for-the-day');
  ok('done shows the summary sheet', await page.locator('.sheet h2', { hasText: 'Day summary' }).isVisible());
  await page.click('.sheet .sf >> text=Close');
  ok('done does not jump to tomorrow', (await page.url()).includes('d=2026-10-24'));
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'ramesh ');
  await page.click(`button[onclick="odStep('${chap}',1)"]`);
  await page.click('#odSave');
  ok('late chapathi order lands after done', await ev(page, () => Object.values(S.events)[0].orders.length === 3));
  // a different spelling stays a different person
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'Ramesh K');
  await page.click(`button[onclick="odStep('${chap}',1)"]`);
  await page.click('#odSave');
  const og = await ev(page, () => owedGroups().map(g => g.name + ':' + g.total));
  ok('owed groups ignore case/spaces only', og.length === 2 && og.includes('Ramesh:110') && og.includes('Ramesh K:30'), JSON.stringify(og));

  // change to give: Priya paid 200 for 180
  await page.locator('.order', { hasText: 'Priya' }).locator('.what').click();
  await page.fill('input[aria-label="Change to give back"]', '20');
  await page.click('#odSave');
  ok('change to give recorded', await ev(page, () => changeRows().length === 1 && changeRows()[0].o.changeDue === 20));

  // holiday on tomorrow, then menu blocked for it
  await page.goto(URL + '#/lunch?d=2026-10-25');
  await page.click('text=Mark tomorrow a holiday');
  ok('holiday recorded', await ev(page, () => !!S.holidays['2026-10-25']));
  await page.click('text=Remove holiday');

  // home reflects the day
  await page.goto(URL + '#/');
  await shot(page, '07-home-with-lunch');
  ok('home tile shows today orders', (await page.locator('a.tile[href="#/lunch"]').textContent()).includes('4'));

  await page.goto(URL + '#/lunch?d=2026-10-24');
  await page.click('.dock >> text=Add order');
  await page.waitForTimeout(350);
  { const b = await page.locator('.sheet .drag').boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + 20); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + 260, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(400);
    ok('swipe down dismisses the sheet', (await page.locator('.sheet').count()) === 0); }
  { const h = await page.locator('.order .ctl .chip').first().boundingBox(); ok('delivered/paid controls are 44px tall', Math.round(h.height) >= 44, String(h.height)); }
  await page.goto(URL + '#/history');
  await shot(page, '08-history');
  ok('history lists Unpaid and Change to give', (await page.textContent('main')).includes('Change to give'));
  ok('no page errors (lunch)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function mondayFlow(browser) {
  const { ctx, page, errors } = await fresh(browser, { time: '2026-10-25T09:00:00' }); // Sunday → tomorrow is Monday
  await page.goto(URL + '#/lunch?d=2026-10-26');
  ok('Monday shows kitchen off', (await page.textContent('main')).includes('Mondays are off'));
  ok('Monday offers no set-menu button', (await page.locator('.dock .btn.primary').count()) === 0);
  await page.goto(URL + '#/lunch/setup?d=2026-10-25');
  await page.click('text=Tomorrow · Mon 26 Oct');
  ok('setup blocks a Monday date', await page.locator('.dock .btn.primary').isDisabled());
  await shot(page, '09-monday-blocked');
  ok('no page errors (monday)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function batterFlow(browser) {
  const { ctx, page, errors } = await fresh(browser, { time: '2026-10-24T09:00:00' });
  await page.goto(URL + '#/batter/setup');
  const idly = await menuId(page, 'batter', 'Idly'), paddu = await menuId(page, 'batter', 'Paddu');
  await page.check(`input[onchange^="bsToggle('${idly}'"]`);
  await page.check(`input[onchange^="bsToggle('${paddu}'"]`);
  await shot(page, '10-batter-setup');
  await page.click('.dock .btn.primary');
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'Anitha');
  // Idly 1 kg = ₹120
  await page.locator('.pick', { hasText: 'Idly' }).locator('button.chip', { hasText: '1 kg' }).click();
  // Paddu 750 g with topping = round(120*0.75)=90 + 15 = 105
  await page.locator('.pick', { hasText: 'Paddu' }).locator('button.chip', { hasText: '750 g' }).click();
  await page.locator('.pick', { hasText: 'Paddu' }).locator('input[type=checkbox]').check();
  await shot(page, '11-batter-order-sheet');
  ok('batter sheet total 225 (120 + 105)', (await page.textContent('#odTot')).includes('225'));
  await page.click('#odSave');
  // 1.5 kg paddu with topping: 180 + 2 kilos started * 15 = 210
  const p15 = await ev(page, (pid) => { const e = Object.values(S.events)[0]; return autoPrice(e, { ref: pid, qty: 1.5, top: true }); }, paddu);
  ok('topping is ₹15 per kilo started (1.5 kg → ₹210)', p15 === 210, String(p15));
  const p2 = await ev(page, (pid) => autoPrice(Object.values(S.events)[0], { ref: pid, qty: 2, top: true }), paddu);
  ok('2 kg paddu with topping → ₹270', p2 === 270, String(p2));
  const half = await ev(page, (pid) => autoPrice(Object.values(S.events)[0], { ref: pid, qty: 0.5, top: true }), paddu);
  ok('½ kg paddu with topping → ₹75', half === 75, String(half));
  const kc = await ev(page, () => kitchenCount(Object.values(S.events)[0]).map(c => c.it.name + ':' + c.q + ':' + c.top));
  ok('to make: Idly 1 kg, Paddu 0.75 kg with topping', kc.includes('Idly:1:0') && kc.includes('Paddu:0.75:0.75'), JSON.stringify(kc));
  await shot(page, '12-batter-batch');
  await page.click('.dock >> text=Close batch');
  ok('closed batch leaves the batter tile', await ev(page, () => liveBatches().length === 0));
  ok('closed batch is in History', await ev(page, () => events('batter').filter(isPast).length === 1));
  ok('unpaid batter order still on Unpaid list', await ev(page, () => owedGroups().some(g => g.name === 'Anitha' && g.total === 225)));
  ok('no page errors (batter)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function dropFlow(browser) {
  const { ctx, page, errors } = await fresh(browser, { time: '2026-10-24T09:00:00' });
  await page.goto(URL + '#/drops/setup');
  await page.fill('#dtitle', 'Deepavali');
  await page.locator('button.row', { hasText: 'Ghee' }).click();
  await page.locator('button.row', { hasText: 'Maddur Vada' }).click();
  // a one-off, not saved to the list
  await page.click('text=One-off item');
  await page.fill('#niName', 'Ambode');
  await page.fill('#niPrice', '15');
  await page.click('#niSave');
  ok('one-off not saved to list by default', await ev(page, () => !S.menus.drops.some(i => i.name === 'Ambode')));
  await shot(page, '13-drop-setup');
  await page.click('.dock .btn.primary');
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'Kavya');
  const ghee = await menuId(page, 'drops', 'Ghee');
  await page.fill(`#kg_${ghee}`, '0.5');      // 1700 * 0.5 = 850
  const mv = await menuId(page, 'drops', 'Maddur Vada');
  for (let i = 0; i < 3; i++) await page.click(`button[onclick="odStep('${mv}',1)"]`); // 90 + 50 = 140
  await shot(page, '14-drop-order-sheet');
  ok('drop sheet total 990 (850 + 140)', (await page.textContent('#odTot')).includes('990'));
  await page.click('#odSave');
  // small weight costs more: 250 g ghee prefills 425, typed over to 450
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'Meena');
  await page.fill(`#kg_${ghee}`, '0.25');
  const pre = await page.inputValue(`#lp_${ghee} input`);
  ok('250 g ghee prefills ₹425', pre === '425', pre);
  await page.fill(`#lp_${ghee} input`, '450');
  await page.click('#odSave');
  ok('typed small-weight price sticks on the order', await ev(page, () => { const e = Object.values(S.events)[0]; return orderTotal(e, e.orders[1]) === 450; }));
  ok('pair price: 4 maddur vada → ₹180', await ev(page, (id) => autoPrice(Object.values(S.events)[0], { ref: id, qty: 4 }), mv) === 180);
  await shot(page, '15-drop-view');
  // second drop on the same day → collections view lists both
  await page.goto(URL + '#/drops/setup');
  await page.fill('#dtitle', 'Ragi malt');
  await page.locator('button.row', { hasText: 'Ragi malt' }).click();
  await page.click('.dock .btn.primary');
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'Kavya');
  const rm = await menuId(page, 'drops', 'Ragi malt');
  await page.fill(`#kg_${rm}`, '1');
  await page.click('#odSave');
  await page.goto(URL + '#/drops');
  await shot(page, '16-drops-list');
  await page.click('text=All 3 together');
  await page.waitForURL(/drops\/date/); await page.waitForSelector('main .order');
  { const n = await page.locator('main .order').count(); ok('collections view shows both drops for the date', n === 3, String(n) + ' ' + page.url()); }
  await shot(page, '17-collections');
  ok('drops never mix: each keeps its own orders', await ev(page, () => liveDrops().map(d => d.orders.length).join(',') === '2,1'));
  ok('no page errors (drops)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function customFlow(browser) {
  const { ctx, page, errors } = await fresh(browser, { time: '2026-10-24T09:00:00' });
  await page.goto(URL + '#/custom/setup');
  await page.fill('#cname', 'Lakshmi');
  await page.fill('#cdate', '2026-10-26');   // a Monday is fine for custom
  const rice = await menuId(page, 'lunch', 'Rice'), ras = await menuId(page, 'lunch', 'Tomato Rasam');
  for (let i = 0; i < 4; i++) await page.click(`button[onclick="csStep('${rice}',1)"]`);
  for (let i = 0; i < 4; i++) await page.click(`button[onclick="csStep('${ras}',1)"]`);
  await page.waitForTimeout(100);
  ok('custom total 320 (4×30 + 4×50)', (await page.textContent('#csTot')).includes('320'));
  await shot(page, '18-custom-setup');
  await page.click('#csSave');
  ok('custom order saved on a Monday, lunch untouched', await ev(page, () => events('custom').length === 1 && events('lunch').length === 0 && !S.holidays['2026-10-26']));
  await shot(page, '19-custom-view');
  ok('no page errors (custom)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function importFlow(browser) {
  const { ctx, page, errors } = await fresh(browser, { time: '2026-10-24T09:00:00' });
  const old = {
    version: 1, days: { '2026-09-01': {} },
    dishPrice: { 'Bisibelebath': { ala: 90 } }, batPrice: { Idly: { kilo: 130 } },
    batter: {
      '2026-09-10': { date: '2026-09-10', type: 'Paddu', top: true, closed: 1, prices: { half: 60, kilo: 120, top: 15 },
        orders: [{ variant: 'plain', size: 'kilo', top: false, q: 2, p: 120, ch: 'group' }],
        slips: [{ id: 's1', name: 'Asha', ch: 'dm', collected: true, paid: false, items: { 'special|threeq|top': 1, 'plain|half': 2 } }] }
    },
    special: {
      sp1: { id: 'sp1', title: 'Ragi malt batch', deliveryDate: '2026-09-20', closed: 1,
        items: [{ id: 'rm', n: 'Ragi malt', priceMode: 'weight', ratePerKg: 1200 }, { id: 'ob', n: 'Obbattu', u: 'piece', p: 45 }],
        slips: [{ id: 'x1', name: 'Geeta', ch: 'dm', collected: true, paid: true, items: { 'rm::250': 2, ob: 3 } }] }
    }
  };
  const msg = await ev(page, (o) => { const m = importOld(o); save(); render(); return m; }, old);
  // Asha: 750 g with topping = round(0.75*120)+15 = 105; 2 × ½ kg = 120 → 225
  const asha = await ev(page, () => { const g = owedGroups().filter(x => x.name === 'Asha')[0]; return g && g.total; });
  ok('import keeps Asha\'s recorded ₹225 and marks it unpaid', asha === 225, String(asha));
  // Geeta: 2 × 250 g at 1200/kg = 2×300 = 600, + 3 × 45 = 135 → 735
  const geeta = await ev(page, () => { const e = events('drop')[0]; return orderTotal(e, e.orders[0]); });
  ok('import keeps Geeta\'s recorded ₹735', geeta === 735, String(geeta));
  ok('anonymous taps come across untracked, never as unpaid', await ev(page, () => { const e = events('batter')[0]; const t = e.orders.filter(o => o.untracked)[0]; return t && orderTotal(e, t) === 240 && !owedGroups().some(g => /Taps/.test(g.name)); }));
  ok('his old prices applied to the lists', await ev(page, () => S.menus.lunch.filter(i => i.name === 'Bisibelebath')[0].price === 90 && S.menus.batter.filter(i => i.name === 'Idly')[0].rate === 130));
  const again = await ev(page, (o) => { const m = importOld(o); save(); return m; }, old);
  ok('re-import says nothing new and keeps the first summary', /Nothing new/.test(again) && /1 batter batch/.test(await ev(page, () => S.meta.imported)), again);
  ok('importing twice adds nothing twice', await ev(page, () => events('batter').length === 1 && events('drop').length === 1));
  ok('import message reports counts', /1 batter batch and 1 drop · 1 unpaid order worth ₹225/.test(msg), msg);
  await page.goto(URL + '#/history');
  await shot(page, '20-history-after-import');
  ok('no page errors (import)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// Opened straight from disk, with no web server: the way Suraj opens it.
async function fromDiskFlow(browser) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(ROOT, 'site/public/index.html'));
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.click('a.tile[href="#/lunch"]');
  ok('from disk: tapping a tile opens it', (await page.textContent('.bar h1')) === 'Daily lunch');
  await page.click('.dock .btn.primary');
  ok('from disk: set menu opens', (await page.textContent('.bar h1')) === 'Set menu');
  await page.locator('.pick input[type=checkbox]').first().check();
  await page.click('.dock .btn.primary');
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'Priya');
  await page.locator('.sheet button[aria-label="More"]').first().click();
  await page.click('#odSave');
  ok('from disk: order saved and listed', (await page.locator('.order').count()) === 1);
  await page.reload();
  ok('from disk: order still there after reload', await page.evaluate(() => events('lunch')[0].orders.length === 1));
  await page.click('.bar .act');            // Menu list
  await page.goBack(); await page.waitForTimeout(200);
  ok('from disk: phone back button returns to the last screen', (await page.textContent('.bar h1')) === 'Daily lunch', await page.textContent('.bar h1'));
  ok('no page errors (disk)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function darkShots(browser) {
  const { ctx, page } = await fresh(browser, { dark: true, time: '2026-10-24T09:00:00' });
  await page.goto(URL + '#/lunch/setup?d=2026-10-24');
  const ids = await ev(page, () => ['Tomato Rasam', 'Rice', 'Chapathi'].map(n => S.menus.lunch.filter(i => i.name === n)[0].id));
  for (const id of ids) await page.check(`input[type=checkbox][onchange*="${id}"]`);
  await page.click('.dock .btn.primary');
  await page.click('.dock >> text=Add order');
  await page.fill('#odName', 'Priya');
  await page.click(`button[onclick="odStep('${ids[1]}',1)"]`);
  await page.click('#odSave');
  await shot(page, '21-dark-lunch-day');
  await page.goto(URL + '#/');
  await shot(page, '22-dark-home');
  await ctx.close();
}

const browser = await chromium.launch();
for (const f of [fromDiskFlow, lunchFlow, mondayFlow, batterFlow, dropFlow, customFlow, importFlow, darkShots]) {
  try { await f(browser); } catch (e) { ok(f.name + ' ran to the end', false, e.message.split('\n')[0]); }
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log(failures.join('\n')); process.exit(1); }
