// South Savory v2.1 — the Costs tab, checked against user-flows-v2.md › Costs, at 375x812.
// Serve the repo root on 8899 first. Every figure is worked out by hand beside it.
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
const shot = async (page, name) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); };
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const text = page => page.textContent('#app');

async function fresh(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: opts.dark ? 'dark' : 'light' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'));
  await page.goto(URL + '#/'); await page.evaluate(() => localStorage.clear()); await page.reload();
  return { ctx, page, errors };
}
async function addIng(page, name, price, unit) {
  await page.click('.dock >> text=New ingredient');
  await page.fill('#ieName', name);
  if (price != null) await page.fill('#iePrice', String(price));
  await page.selectOption('#ieUnit', unit);
  await page.click('#ieSave'); await page.waitForTimeout(300);
}
async function addLine(page, name, qty) {
  await page.click('text=Add ingredient');
  await page.fill('.sheet input[type=search]', name);
  await page.click(`#ipList button:has-text("${name}")`); await page.waitForTimeout(350);
  const ins = page.locator('#rdLines input'); await ins.last().fill(String(qty));
}

const browser = await chromium.launch();
const { page, errors } = await fresh(browser);

// the tab
ok('bottom bar has three tabs: Home, History, Costs', (await page.locator('.tabbar a').allTextContents()).join('|').replace(/\d/g, '') === 'Home|History|Costs');
await page.click('.tabbar >> text=Costs');
ok('Costs opens with the three curry tiers', (await text(page)).includes('Up to 1 vegetable') && (await text(page)).includes('More than 2'));
ok('overhead starts at his 15%', (await text(page)).includes('15%'));
ok('ingredient list starts empty: no guessed prices', await ev(page, () => S.costs.ings.length === 0));
ok('menu lists carry no cost fields', await ev(page, () => S.menus.lunch.every(i => !('cost' in i) && !('recipe' in i))));
await shot(page, '30-costs-empty');

// ingredients
await page.click('text=Ingredients');
await addIng(page, 'Toor dal', 110, 'kg');
await addIng(page, 'Tomato', 40, 'kg');
await addIng(page, 'Pepper', 800, 'kg');
await addIng(page, 'Coconut', null, 'piece');
ok('four ingredients saved', await ev(page, () => S.costs.ings.length === 4));
ok('an ingredient with no price says so', (await text(page)).includes('No price'));
await page.click('.dock >> text=New ingredient'); await page.fill('#ieName', 'toor dal'); await page.click('#ieSave');
ok('the same ingredient twice is refused (not case-sensitive)', await ev(page, () => S.costs.ings.length === 4));
await page.click('.sheet .sh >> text=Cancel'); await page.waitForTimeout(300);
await shot(page, '31-ingredients');

// tier 1 pot: toor dal 400 g = ₹44, tomato 1500 g = ₹60 → ₹104; +15% = ₹15.6 → ₹119.6; makes 20 → ₹5.98 a portion
await page.goto(URL + '#/costs/tier/1'); await page.reload();
await addLine(page, 'Toor dal', 400);
await addLine(page, 'Tomato', 1500);
await page.fill('#rdMakes', '20');
const sum1 = await page.textContent('#rdSum');
ok('calculator: ingredients ₹104', sum1.includes('₹104'), sum1);
ok('calculator: overhead 15% shown as its own line, ₹15.6', sum1.includes('Overhead 15%') && sum1.includes('₹15.6'), sum1);
ok('calculator: pot total ₹119.6 shown as ₹120, ₹6 a portion', sum1.includes('₹120') && /Cost per portion\s*₹6\b/.test(sum1), sum1);
await shot(page, '32-tier-recipe');
await page.click('.dock >> text=Save'); await page.waitForTimeout(300);
ok('tier recipe saved', await ev(page, () => { const r = S.costs.recipes.filter(r => r.id === 'tier1')[0]; return r && r.makes === 20 && r.lines.length === 2; }));
ok('saving a tier recipe returns to Costs', page.url().endsWith('#/costs'));
await page.goto(URL + '#/costs/tier/1'); await page.reload();
await page.click('.bar .back'); await page.waitForTimeout(200);
ok('Back from a tier recipe goes to Costs', page.url().endsWith('#/costs'));

// a dish takes its tier from its price, and can change it
const rasam = await ev(page, () => S.menus.lunch.filter(i => i.name === 'Tomato Rasam')[0].id);
await page.goto(URL + '#/costs/item/lunch/' + rasam); await page.reload();
ok('Tomato Rasam (₹50) guesses the up-to-1-veg tier', (await page.getAttribute('.seg button[aria-pressed="true"]', 'onclick')).includes(',1)'));
ok('first guess is labelled as a guess', (await text(page)).includes('First guess from its price'));
const m1 = await text(page);
ok('dish shows tier cost ₹6, sells ₹50, ₹44 left (88%)', m1.includes('₹6') && m1.includes('₹50') && m1.includes('₹44') && m1.includes('88%'), m1.slice(0, 400));
await shot(page, '33-dish-on-tier');
await page.click('.seg >> text=2 veg');
ok('changing the tier is kept on the dish', await ev(page, id => S.menus.lunch.filter(i => i.id === id)[0].tier === 2, rasam));
ok('a tier with no recipe says so instead of a cost', (await text(page)).includes('tier has no recipe yet'));
await page.click('.seg >> text=Up to 1 veg');

// pepper rasam gets its own recipe: pepper 50 g ₹40, toor dal 300 g ₹33, tomato 500 g ₹20 → ₹93; +15% ₹13.95 → ₹106.95; ÷15 = ₹7.13
const pepper = await ev(page, () => S.menus.lunch.filter(i => i.name === 'Pepper Rasam')[0].id);
await page.goto(URL + '#/costs/item/lunch/' + pepper); await page.reload();
await page.click('.dock >> text=Give it its own recipe');
ok('own recipe starts from the tier pot', (await page.locator('#rdLines .rline').count()) === 2);
await page.locator('#rdLines .x').first().click(); await page.locator('#rdLines .x').first().click();
await addLine(page, 'Pepper', 50); await addLine(page, 'Toor dal', 300); await addLine(page, 'Tomato', 500);
await page.fill('#rdMakes', '15');
const sum2 = await page.textContent('#rdSum');
ok('own recipe: ₹93 + ₹13.95 = ₹107 pot, ₹7.1 a portion', sum2.includes('₹93') && sum2.includes('₹107') && sum2.includes('₹7.1'), sum2);
ok('margin: sells ₹50, ₹42.9 left, 86%', sum2.includes('₹42.9') && sum2.includes('86%'), sum2);
await shot(page, '34-own-recipe');
await page.click('.dock >> text=Save'); await page.waitForTimeout(300);
ok('own recipe wins over the tier', await ev(page, id => Math.abs(unitCost('lunch', id) - 106.95 / 15) < 1e-9 && costInfo('lunch', id).src === 'own', pepper));
ok('saving an own recipe returns to Costs', page.url().endsWith('#/costs'));
ok('saving says Saved', await page.locator('#toast', { hasText: 'Saved' }).isVisible());
ok('Costs no longer shows the recipe Save button', (await page.locator('.dock >> text=Save').count()) === 0);
// reopen the saved recipe from Costs (the bug: Back pointed at the same screen)
await page.goto(URL + '#/costs/item/lunch/' + pepper); await page.reload();
ok('a dish with its own recipe opens the recipe', (await page.locator('#rdLines .rline').count()) === 3);
await page.click('.bar .back'); await page.waitForTimeout(200);
ok('Back from a saved own recipe goes to Costs', page.url().endsWith('#/costs') && (await page.locator('.bar h1').textContent()) === 'Costs');
// edit and save again: lands on Costs with the change kept
await page.goto(URL + '#/costs/item/lunch/' + pepper); await page.reload();
await page.fill('#rdMakes', '14');
await page.click('.dock >> text=Save'); await page.waitForTimeout(300);
ok('editing a saved recipe keeps the change and returns to Costs', page.url().endsWith('#/costs') && await ev(page, id => S.costs.recipes.filter(r => r.menuId === id)[0].makes === 14, pepper));
await page.goto(URL + '#/costs/item/lunch/' + pepper); await page.reload();
await page.fill('#rdMakes', '15');
await page.click('.dock >> text=Save'); await page.waitForTimeout(300);

// removing a lunch dish's own recipe drops it back to its tier, and Undo restores it
await page.goto(URL + '#/costs/item/lunch/' + pepper); await page.reload();
await page.click('text=Remove own recipe, go back to its tier'); await page.waitForTimeout(200);
ok('removing an own recipe shows the dish on its tier', (await page.locator('.dock').textContent()).includes('Give it its own recipe'));
await page.click('#toastUndo'); await page.waitForTimeout(200);
ok('undo brings the own recipe back', await ev(page, id => costInfo('lunch', id).src === 'own', pepper));

// back out of an unsaved own recipe without looping
const huli = await ev(page, () => S.menus.lunch.filter(i => i.name === 'Huruli Saaru')[0].id);
await page.goto(URL + '#/costs/item/lunch/' + huli); await page.reload();
await page.click('.dock >> text=Give it its own recipe');
await page.click('.bar .back'); await page.waitForTimeout(200);
ok('Back from an unsaved recipe returns to the dish\'s tier', (await text(page)).includes('Give it its own recipe') || (await page.locator('.dock').textContent()).includes('Give it its own recipe'));

// coconut has no price: a recipe using it shows no cost, and says why
await page.goto(URL + '#/costs/item/batter/' + await ev(page, () => S.menus.batter.filter(i => i.name === 'Idly')[0].id)); await page.reload();
ok('batter recipe is per kg', (await text(page)).includes('kg'));
await addLine(page, 'Coconut', 1); await page.fill('#rdMakes', '5');
ok('missing price: no cost, and names the ingredient', (await page.textContent('#rdSum')).includes('No price yet for Coconut'));

// overhead is one setting
await page.goto(URL + '#/costs'); await page.reload();
await page.click('text=Overhead'); await page.fill('#ohIn', '20'); await page.click('.sheet >> text=Save'); await page.waitForTimeout(300);
ok('overhead changes in one place and every cost follows', await ev(page, () => S.costs.overhead === 20 && Math.abs(unitCost('lunch', S.menus.lunch.filter(i => i.name === 'Tomato Rasam')[0].id) - 104 * 1.2 / 20) < 1e-9));
await page.click('text=Overhead'); await page.fill('#ohIn', '15'); await page.click('.sheet >> text=Save'); await page.waitForTimeout(300);

// today's lunch, then the monthly report
await ev(page, () => {
  const tr = S.menus.lunch.filter(i => i.name === 'Tomato Rasam')[0], rice = S.menus.lunch.filter(i => i.name === 'Rice')[0];
  const e = { id: uid(), kind: 'lunch', date: todayKey(), status: 'open', items: [{ id: tr.id, name: tr.name, group: tr.group, price: 50 }, { id: rice.id, name: 'Rice', group: rice.group, price: 30 }], combos: [], orders: [], createdAt: Date.now() };
  e.orders.push({ id: uid(), name: 'A', ch: 'dm', lines: [{ ref: tr.id, qty: 2, price: null }, { ref: rice.id, qty: 2, price: null }], delivered: false, paid: true, t: 1 });
  e.orders.push({ id: uid(), name: 'B', ch: 'dm', lines: [{ ref: tr.id, qty: 1, price: null }], delivered: false, paid: false, t: 2 });
  S.events[e.id] = e; save(); render();
});
const costsHome = await text(page);
ok("Costs shows today's lunch with cost per portion", costsHome.includes("Today's lunch") && costsHome.includes('Tomato Rasam'));
ok('no profit figure on the daily view', !/profit/i.test(costsHome.split('Monthly report')[0]));
await shot(page, '35-costs-today');
// revenue 3×₹50 + 2×₹30 = ₹210; cost 3×₹5.98 = ₹17.94 → ₹18; rice not costed (₹60); profit ₹150 − ₹17.94 = ₹132
await page.click('text=Monthly report');
const rep = await text(page);
ok('month: revenue ₹210 (paid and unpaid)', rep.includes('₹210'), rep.slice(0, 300));
ok('month: cost ₹18, profit ₹132', rep.includes('₹18') && rep.includes('₹132'), rep.slice(0, 300));
ok('month: uncosted sales flagged, not counted free', rep.includes('₹60 of sales') && rep.includes('Rice'));
ok('next month is disabled for the current month', await page.isDisabled('[aria-label="Next month"]'));
await shot(page, '36-month');
await page.click('[aria-label="Previous month"]');
ok('previous month: September', (await text(page)).includes('September 2026'));

// sync rows: costs travel as their own rows and come back intact
ok('costs flatten to c: rows and back', await ev(page, () => {
  const m = flatten(S), ids = Object.keys(m);
  const back = unflatten(m, S.meta);
  return ids.some(k => k.startsWith('c:i:')) && ids.some(k => k.startsWith('c:r:')) && m['c:set'] === '{"overhead":15}' &&
    back.costs.ings.length === 4 && back.costs.recipes.length === S.costs.recipes.length && back.costs.overhead === 15 &&
    ids.every(k => /^[mehoxc]:[\w:.-]{1,200}$/.test(k));
}));

// old app: his own ingredient prices come across; its looked-up prices don't
const imp = await ev(page, () => {
  const before = S.costs.ings.length;
  const res = importOld({ days: {}, batter: {}, special: {}, cost: { ingPrice: { 'Toor dal': 999, 'Urad dal': 130, 'Milk': 56 }, ingUnit: {} } });
  const urad = ingByName('Urad dal'), milk = ingByName('Milk'), toor = ingByName('Toor dal');
  return { res, added: S.costs.ings.length - before, urad: urad && urad.price + urad.unit, milk: milk && milk.unit, toor: toor.price };
});
ok('old app: his ingredient prices brought in, units kept', imp.added === 2 && imp.urad === '130kg' && imp.milk === 'L', JSON.stringify(imp));
ok('old app: an ingredient already in the list is not overwritten', imp.toor === 110);
ok('old app: import message counts them', imp.res.includes('2 ingredient prices'), imp.res);

// a wrong ingredient added from inside a recipe can be fixed or removed right there
const p2 = await fresh(browser);
await p2.page.goto(URL + '#/costs/ingredients'); await p2.page.reload();
await addIng(p2.page, 'Papad', 60, 'piece');
await addIng(p2.page, 'Wrong thing', 5, 'kg');
await p2.page.goto(URL + '#/costs/tier/1');
await p2.page.click('text=Add ingredient'); await p2.page.waitForTimeout(350);
await p2.page.click('#ipList button[aria-label="Edit Wrong thing"]'); await p2.page.waitForTimeout(350);
await p2.page.click('.sheet >> text=Remove ingredient'); await p2.page.waitForTimeout(400);
ok('picker: Edit opens the ingredient and Remove takes it out', await ev(p2.page, () => !ingByName('Wrong thing')));
ok('picker: after removing, the ingredient list is back without it', (await p2.page.textContent('#ipList')).includes('Papad') && !(await p2.page.textContent('#ipList')).includes('Wrong thing'));

// papad is bought by the pack and used by the piece
await p2.page.click('#ipList button:has-text("Papad")'); await p2.page.waitForTimeout(350);
await p2.page.locator('#rdLines input').last().fill('2');
await p2.page.fill('#rdMakes', '20');
await p2.page.click('.dock >> text=Save'); await p2.page.waitForTimeout(300);
await p2.page.goto(URL + '#/costs/ingredients');
await p2.page.click('button:has-text("Papad")'); await p2.page.waitForTimeout(350);
const units = await p2.page.locator('#ieUnit option').evaluateAll(os => os.map(o => o.value).join(','));
ok('pack: in a recipe, a piece ingredient can switch only to per pack', units === 'piece,pack', units);
await p2.page.selectOption('#ieUnit', 'pack');
await p2.page.click('#ieSave'); await p2.page.waitForTimeout(200);
ok('pack: asks how many pieces before saving', await p2.page.isVisible('#iePackErr'));
await p2.page.fill('#iePack', '20');
await p2.page.click('#ieSave'); await p2.page.waitForTimeout(350);
ok('pack: list shows the pack size', (await text(p2.page)).includes('per pack of 20'));
// ₹60 for 20 = ₹3 a piece; 2 pieces = ₹6; + 15% = ₹6.90; 20 portions = ₹0.345 each
const pc = await ev(p2.page, () => { const r = recipeCost(recipeById('tier1')); return [r.ing, Math.round(r.per * 1000)]; });
ok('pack: recipe costs 2 pieces at ₹3 each', pc[0] === 6 && pc[1] === 345, JSON.stringify(pc));
await p2.page.goto(URL + '#/costs/tier/1');
ok('pack: recipe line says per pack of 20 and ₹6', (await p2.page.textContent('#rdLines')).includes('₹60 per pack of 20') && (await p2.page.textContent('#rdLines')).includes('₹6'));
ok('pack: no page errors', p2.errors.length === 0, p2.errors.join(' | '));

// dark mode renders
const d = await fresh(browser, { dark: true });
await d.page.goto(URL + '#/costs'); await d.page.reload();
await shot(d.page, '37-costs-dark');

ok('no page errors', errors.length === 0 && d.errors.length === 0, [...errors, ...d.errors].join(' | '));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log(failures.join('\n')); process.exit(1); }
