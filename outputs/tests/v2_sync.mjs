// Two phones, one shared list: run against `npx wrangler pages dev` in site/ (port 8788),
// with APP_PASSWORD=local-test-only in site/.dev.vars.
import { chromium } from 'playwright';

const URL = 'http://localhost:8788/';
const PW = 'local-test-only';
let pass = 0, fail = 0; const failures = [];
function ok(name, cond, detail) {
  if (cond) pass++; else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (!cond && detail ? '  (' + detail + ')' : ''));
}
const wait = ms => new Promise(r => setTimeout(r, ms));

async function phone(browser, label) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(label + ': ' + e.message));
  return { ctx, page, errors };
}
async function signIn(page, pw = PW) {
  await page.goto(URL);
  await page.fill('#pw', pw);
  await page.click('button[type=submit]');
  await page.waitForLoadState('load');
}
const sync = page => page.evaluate(async () => { await syncNow(); return SYNC.state; });
const state = (page, fn, arg) => page.evaluate(fn, arg);

const browser = await chromium.launch();
const A = await phone(browser, 'Suraj'), B = await phone(browser, 'sister');

// the gate
await A.page.goto(URL);
ok('signed out: only the login screen shows', (await A.page.locator('#pw').count()) === 1 && !(await A.page.content()).includes('Daily lunch'));
const api = await A.page.evaluate(async () => (await fetch('/api/sync')).status);
ok('signed out: the data answers 401', api === 401, String(api));
await signIn(A.page, 'wrong guess');
ok('wrong password is refused', (await A.page.textContent('body')).includes('That password is wrong'));
await signIn(A.page);
ok('right password opens the app', (await A.page.locator('.tile').count()) === 4);
await A.page.waitForFunction(() => SYNC.on && SYNC.state === 'ok', null, { timeout: 10000 });
ok('phone A connects to the shared list', await state(A.page, () => SYNC.on));

// phone A starts a batch and takes an order
await A.page.evaluate(() => {
  const idly = S.menus.batter.filter(i => i.name === 'Idly')[0];
  const ev = { id: uid(), kind: 'batter', date: addDays(todayKey(), 2), status: 'open', items: [{ id: idly.id, name: 'Idly', rate: 120, topping: null }], orders: [], createdAt: Date.now() };
  S.events[ev.id] = ev;
  ev.orders.push({ id: uid(), name: 'Anitha', ch: 'dm', lines: [{ ref: idly.id, qty: 1, price: null }], delivered: false, paid: false, t: Date.now() });
  save();
});
await wait(800); await sync(A.page);

// phone B signs in fresh and sees it, with no duplicate menu
await signIn(B.page);
await B.page.waitForFunction(() => SYNC.on && SYNC.state === 'ok' && Object.keys(S.events).length > 0, null, { timeout: 10000 });
ok('phone B sees phone A\'s batch and order', await state(B.page, () => { const e = events('batter')[0]; return e && e.orders.length === 1 && e.orders[0].name === 'Anitha'; }));
const menuA = await state(A.page, () => S.menus.lunch.length), menuB = await state(B.page, () => S.menus.lunch.length);
ok('a new phone takes the shared menu, no duplicates', menuA === menuB && menuB === 56, menuA + ' / ' + menuB);

// both phones add an order to the same batch at the same moment
await Promise.all([
  A.page.evaluate(() => { const e = events('batter')[0]; e.orders.push({ id: uid(), name: 'Ravi', ch: 'group', lines: [{ ref: e.items[0].id, qty: 0.5, price: null }], delivered: false, paid: false, t: Date.now() }); save(); }),
  B.page.evaluate(() => { const e = events('batter')[0]; e.orders.push({ id: uid(), name: 'Shobha', ch: 'dm', lines: [{ ref: e.items[0].id, qty: 0.75, price: null }], delivered: false, paid: false, t: Date.now() }); save(); }),
]);
await wait(900); await sync(A.page); await sync(B.page); await sync(A.page);
const namesA = await state(A.page, () => events('batter')[0].orders.map(o => o.name).sort().join(','));
const namesB = await state(B.page, () => events('batter')[0].orders.map(o => o.name).sort().join(','));
ok('orders taken at the same time on both phones are both kept', namesA === 'Anitha,Ravi,Shobha' && namesB === namesA, namesA + ' | ' + namesB);

// sister marks paid; Suraj sees it
await B.page.evaluate(() => { const o = events('batter')[0].orders.filter(x => x.name === 'Anitha')[0]; o.paid = true; o.paidAt = Date.now(); save(); });
await wait(700); await sync(B.page); await sync(A.page);
ok('paid on one phone shows paid on the other', await state(A.page, () => events('batter')[0].orders.filter(x => x.name === 'Anitha')[0].paid === true));
const owedA = await state(A.page, () => owedGroups().map(g => g.name + ':' + g.total).join(','));
ok('unpaid list agrees on both phones', owedA === await state(B.page, () => owedGroups().map(g => g.name + ':' + g.total).join(',')), owedA);

// deleting on one phone removes it on the other
await A.page.evaluate(() => { const e = events('batter')[0]; e.orders = e.orders.filter(o => o.name !== 'Ravi'); save(); });
await wait(700); await sync(A.page); await sync(B.page);
ok('a deleted order disappears on the other phone', await state(B.page, () => !events('batter')[0].orders.some(o => o.name === 'Ravi')));

// no signal: the edit waits on the phone, then goes up
await B.ctx.setOffline(true);
await B.page.evaluate(() => { const e = events('batter')[0]; e.orders.push({ id: uid(), name: 'Geeta', ch: 'dm', lines: [{ ref: e.items[0].id, qty: 1, price: null }], delivered: false, paid: false, t: Date.now() }); save(); });
await wait(700); await sync(B.page);
ok('offline: the change waits on the phone', await state(B.page, () => SYNC.state === 'offline' && Object.keys(SYNC.pending).length > 0));
ok('offline: the phone says so', (await state(B.page, () => syncText())).includes('waiting'));
await B.ctx.setOffline(false);
await sync(B.page); await sync(A.page);
ok('back online: the waiting order reaches the other phone', await state(A.page, () => events('batter')[0].orders.some(o => o.name === 'Geeta')));

// the order sheet on screen isn't wiped by a sync arriving
await A.page.click('a.tile[href="#/batter"]');
await A.page.locator('a.row').first().click();
await A.page.click('.dock >> text=Add order');
await A.page.fill('#odName', 'Half typed');
await B.page.evaluate(() => { const e = events('batter')[0]; e.orders[0].delivered = true; save(); });
await wait(700); await sync(B.page); await sync(A.page);
ok('a sync never wipes what you are typing', (await A.page.inputValue('#odName')) === 'Half typed');

// a reload keeps the place in the shared list
await B.page.reload(); await B.page.waitForFunction(() => SYNC.on && SYNC.state === 'ok', null, { timeout: 10000 });
ok('after reload phone B still has everything', await state(B.page, () => events('batter')[0].orders.length === 3));

ok('no page errors', [...A.errors, ...B.errors].length === 0, [...A.errors, ...B.errors].join(' | '));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log(failures.join('\n')); process.exit(1); }
