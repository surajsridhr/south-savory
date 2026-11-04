// South Savory — the recipe flow end to end, by taps only, at 375x812. No page.goto after the start:
// every screen is reached the way Suraj reaches it on the phone (the bug in his 29 Oct recording).
// Serve the repo root on 8899 first.
import { chromium } from 'playwright';

const URL = 'http://localhost:8899/site/public/index.html';
let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) pass++; else fail++;
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (!cond && detail ? '  (' + detail + ')' : ''));
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const title = page => page.locator('.bar h1').textContent();
const route = page => page.evaluate(() => location.hash);
const wait = page => page.waitForTimeout(350);
const menuId = (page, name) => ev(page, n => S.menus.lunch.filter(i => i.name === n)[0].id, name);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message));
// one handler for every confirm: answer with `answer`, remember what was asked
let asked = '', answer = 'accept';
page.on('dialog', d => { asked = d.message(); answer === 'accept' ? d.accept() : d.dismiss(); });
await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'));
await page.goto(URL + '#/'); await ev(page, () => localStorage.clear()); await page.reload();

// today's lunch with Rice and Tomato Rasam, set up through the app
await page.click('a.tile[href="#/lunch"]');
await page.click('.dock .btn.primary');
for (const n of ['Rice', 'Tomato Rasam']) await page.check(`input[type=checkbox][onchange*="${await menuId(page, n)}"]`);
await page.click('.dock .btn.primary'); await wait(page);

// an ingredient with a price
await page.click('.tabbar >> text=Costs'); await wait(page);
await page.click('a.row[href="#/costs/ingredients"]'); await wait(page);
await page.click('.dock >> text=New ingredient');
await page.fill('#ieName', 'Raw Rice'); await page.fill('#iePrice', '78'); await page.selectOption('#ieUnit', 'kg');
await page.click('#ieSave'); await wait(page);
await page.click('.bar .back'); await wait(page);
ok('Back from Ingredients goes to Costs', await title(page) === 'Costs');

// Rice: from Costs › Today's lunch, straight into its recipe; 250 g raw rice, makes 4
const rice = await menuId(page, 'Rice');
await page.click(`a.row[href="#/costs/item/lunch/${rice}"]`); await wait(page);
ok('tapping Rice opens its recipe, empty', await title(page) === 'Rice' && (await page.locator('#rdLines .rline').count()) === 0);
await page.click('text=Add ingredient'); await page.fill('.sheet input[type=search]', 'Raw Rice');
await page.click('#ipList button:has-text("Raw Rice")'); await wait(page);
await page.locator('#rdLines input').last().fill('250');
await page.fill('#rdMakes', '4');
ok('recipe shows ₹19.5 of rice and ₹5.6 a portion, as in the recording', (await page.textContent('#rdSum')).includes('₹19.5') && (await page.textContent('#rdSum')).includes('₹5.6'));
await page.click('.dock >> text=Save'); await wait(page);
ok('Save on a new recipe lands on Costs', await title(page) === 'Costs', await route(page));
ok('Save shows Saved', await page.locator('#toast', { hasText: 'Saved' }).isVisible());
ok('no Save button left on Costs', (await page.locator('.dock >> text=Save').count()) === 0);
ok('Costs lists Rice with its own recipe', (await page.textContent('#app')).includes('Rice'));

// the recording: open the saved Rice recipe, tap Back
await page.click(`a.row[href="#/costs/item/lunch/${rice}"] >> nth=0`); await wait(page);
ok('Rice opens its saved recipe', (await page.locator('#rdLines .rline').count()) === 1 && await title(page) === 'Rice');
await page.click('.bar .back'); await wait(page);
ok('Back from the saved recipe goes to Costs (was stuck)', await title(page) === 'Costs', await route(page));

// the recording: open it, tap Save without changes
await page.click(`a.row[href="#/costs/item/lunch/${rice}"] >> nth=0`); await wait(page);
await page.click('.dock >> text=Save'); await wait(page);
ok('Save with no changes lands on Costs (was stuck)', await title(page) === 'Costs');

// edit, save, reopen: the change is there
await page.click(`a.row[href="#/costs/item/lunch/${rice}"] >> nth=0`); await wait(page);
await page.fill('#rdMakes', '5'); await page.click('.dock >> text=Save'); await wait(page);
await page.click(`a.row[href="#/costs/item/lunch/${rice}"] >> nth=0`); await wait(page);
ok('an edit is kept after Save and reopen', await page.inputValue('#rdMakes') === '5');

// unsaved edits: Back asks first. Cancel keeps you and your edit; Discard leaves and drops it
await page.fill('#rdMakes', '9');
answer = 'dismiss';
await page.click('.bar .back'); await wait(page);
ok('Back with unsaved edits asks first', asked.includes('Discard your changes'), asked);
ok('Cancel keeps the recipe and the edit', await title(page) === 'Rice' && await page.inputValue('#rdMakes') === '9');
asked = '';
answer = 'dismiss';
await page.click('.tabbar >> text=Home'); await wait(page);
ok('a tab with unsaved edits asks too', asked.includes('Discard') && await title(page) === 'Rice');
asked = '';
answer = 'dismiss';
await page.goBack(); await wait(page);
ok('phone back with unsaved edits asks too, and stays', asked.includes('Discard') && await title(page) === 'Rice' && await page.inputValue('#rdMakes') === '9');
answer = 'accept';
await page.click('.bar .back'); await wait(page);
ok('Discard goes to Costs', await title(page) === 'Costs');
await page.click(`a.row[href="#/costs/item/lunch/${rice}"] >> nth=0`); await wait(page);
ok('discarded edit is gone, saved value kept', await page.inputValue('#rdMakes') === '5');
asked = '';
answer = 'dismiss';
await page.click('.bar .back'); await wait(page);
ok('Back with no edits does not ask', asked === '' && await title(page) === 'Costs');
await page.click(`a.row[href="#/costs/item/lunch/${rice}"] >> nth=0`); await wait(page);
await page.goBack(); await wait(page);
ok('phone back from the recipe goes to Home', (await page.textContent('#app')).includes('Daily lunch') && asked === '');
await page.click('.tabbar >> text=Costs'); await wait(page);
answer = 'accept';

// a new recipe, backed out of before saving, goes to Costs and saves nothing
const rasam = await menuId(page, 'Tomato Rasam');
await page.click(`a.row[href="#/costs/item/lunch/${rasam}"]`); await wait(page);
await page.click('.bar .back'); await wait(page);
ok('Back from an unsaved new recipe goes to Costs', await title(page) === 'Costs' && await ev(page, id => !recipeById(itemRecipeId('lunch', id)), rasam));

// remove Rice's recipe: lands on Costs, Rice not costed; Undo restores
await page.click(`a.row[href="#/costs/item/lunch/${rice}"] >> nth=0`); await wait(page);
await page.click('text=Remove this recipe'); await wait(page);
ok('remove lands on Costs with Rice not costed', await title(page) === 'Costs' && await ev(page, id => unitCost('lunch', id) === null, rice));
await page.click('#toastUndo'); await wait(page);
ok('Undo brings the recipe back', await ev(page, id => recipeById(itemRecipeId('lunch', id)) && recipeById(itemRecipeId('lunch', id)).lines.length === 1, rice));

// ---------- edge cases ----------
// an empty recipe can't be saved
await page.click(`a.row[href="#/costs/item/lunch/${rasam}"]`); await wait(page);
await page.click('.dock >> text=Save'); await wait(page);
ok('empty recipe: Save says what is missing', await page.locator('#rdErr').isVisible() && (await page.textContent('#rdErr')).includes('at least one ingredient'));
ok('empty recipe: nothing saved', await ev(page, id => costInfo('lunch', id).src === null, rasam) && await title(page) === 'Tomato Rasam');

// an ingredient with no amount: no cost, and it says which
await page.click('text=Add ingredient'); await page.fill('.sheet input[type=search]', 'Raw Rice');
await page.click('#ipList button:has-text("Raw Rice")'); await wait(page);
await page.fill('#rdMakes', '4');
ok('no amount: cost not shown and the note names it', (await page.textContent('#rdSum')).includes('Fill in the amount of Raw Rice') && !(await page.textContent('#rdSum')).includes('Cost per portion₹'));
await page.locator('#rdLines input').last().fill('-50');
ok('a negative amount counts as no amount', (await page.textContent('#rdSum')).includes('Fill in the amount of Raw Rice'));
await page.locator('#rdLines input').last().fill('100');
await page.fill('#rdMakes', '0');
ok('makes 0: asks how much it makes', (await page.textContent('#rdSum')).includes('Fill in how much it makes'));
await page.fill('#rdMakes', '-3');
ok('makes below 0: asks how much it makes', (await page.textContent('#rdSum')).includes('Fill in how much it makes'));
await page.fill('#rdMakes', '2.5');
ok('decimal makes works: ₹7.8 + 15% over 2.5 = ₹3.6', (await page.textContent('#rdSum')).includes('₹3.6'), await page.textContent('#rdSum'));
answer = 'accept';
await page.click('.bar .back'); await wait(page);
answer = 'accept';
if (await title(page) !== 'Costs') { await page.click('.bar .back'); await wait(page); }

// ingredients: negative price refused, duplicate refused, unit fixed once used, price change flows through
await page.click('a.row[href="#/costs/ingredients"]'); await wait(page);
await page.click('.dock >> text=New ingredient');
await page.fill('#ieName', 'Ghee'); await page.fill('#iePrice', '-5'); await page.click('#ieSave'); await wait(page);
ok('negative price: says why and keeps the sheet open', await page.locator('#ieErr').isVisible() && await ev(page, () => !ingByName('Ghee')));
await page.fill('#iePrice', '850'); await page.selectOption('#ieUnit', 'kg'); await page.click('#ieSave'); await wait(page);
ok('ghee added once the price is fixed', await ev(page, () => ingByName('Ghee') && ingByName('Ghee').price === 850));
await page.click('.dock >> text=New ingredient');
await page.fill('#ieName', 'raw rice '); await page.click('#ieSave'); await wait(page);
ok('same name in other case refused', await ev(page, () => S.costs.ings.filter(g => normName(g.name) === 'raw rice').length === 1));
await page.click('.sheet .sh >> text=Cancel'); await wait(page);
await page.click('button.row:has-text("Raw Rice")'); await wait(page);
ok('an ingredient in recipes keeps to units counted the same way, and says why', (await page.locator('#ieUnit option').evaluateAll(os => os.map(o => o.value).join(','))) === 'kg' && (await page.textContent('.sheet')).includes('so amounts there stay in g'));
const before = await ev(page, id => unitCost('lunch', id), rice);
await page.fill('#iePrice', '100'); await page.click('#ieSave'); await wait(page);
const after = await ev(page, id => unitCost('lunch', id), rice);
ok('price change flows into the recipe cost (₹78 → ₹100 a kg)', Math.abs(after / before - 100 / 78) < 1e-9, before + ' → ' + after);
await page.click('button.row:has-text("Ghee")'); await wait(page);
ok('an unused ingredient can change unit', !(await page.locator('#ieUnit').isDisabled()));
await page.click('.sheet .sh >> text=Cancel'); await wait(page);
// removing an ingredient used in a recipe: the recipe loses the line, Undo puts it back
await page.click('button.row:has-text("Raw Rice")'); await wait(page);
await page.click('text=Remove ingredient'); await wait(page);
ok('removed ingredient leaves the recipes', await ev(page, () => S.costs.recipes.every(r => r.lines.every(l => ingById(l.ing)))) && await ev(page, id => unitCost('lunch', id) === null, rice));
await page.click('#toastUndo'); await wait(page);
ok('Undo restores the ingredient and its recipe lines', await ev(page, id => unitCost('lunch', id) !== null, rice));
await page.click('.bar .back'); await wait(page);

// overhead: blank or negative is explained, a valid one changes every cost
await page.click('button.row:has-text("Overhead")');
await page.fill('#ohIn', ''); await page.click('.sheet .sf >> text=Save'); await wait(page);
ok('blank overhead: says why, sheet stays', await page.locator('#ohErr').isVisible() && await page.locator('.sheet.show').count() === 1);
await page.fill('#ohIn', '-2'); await page.click('.sheet .sf >> text=Save'); await wait(page);
ok('negative overhead refused', await ev(page, () => overhead() === 15));
const c15 = await ev(page, id => unitCost('lunch', id), rice);
await page.fill('#ohIn', '0'); await page.click('.sheet .sf >> text=Save'); await wait(page);
ok('overhead 0 allowed and costs drop by 15%', await ev(page, (a) => Math.abs(unitCost('lunch', a.id) * 1.15 - a.c) < 1e-9, { id: rice, c: c15 }));
await page.click('button.row:has-text("Overhead")'); await page.fill('#ohIn', '15'); await page.click('.sheet .sf >> text=Save'); await wait(page);

// Cost an item: search, pick a batter item, give it a recipe, it lists under Costed items
await page.click('.dock >> text=Cost an item');
await page.fill('.sheet input[type=search]', 'idl');
ok('search narrows the items', (await page.locator('#cpList .row').count()) >= 1 && (await page.textContent('#cpList')).includes('Idly'));
await page.fill('.sheet input[type=search]', 'zzzz');
ok('no match says so', (await page.textContent('#cpList')).includes('Nothing matches'));
await page.fill('.sheet input[type=search]', 'idly');
await page.click('#cpList .row:has-text("Idly") >> nth=0'); await wait(page);
ok('batter recipe is per kg', (await page.textContent('#app')).includes('kg') && await title(page) === 'Idly');
await page.click('text=Add ingredient'); await page.fill('.sheet input[type=search]', 'Raw Rice');
await page.click('#ipList button:has-text("Raw Rice")'); await wait(page);
await page.locator('#rdLines input').last().fill('1000'); await page.fill('#rdMakes', '3');
await page.click('.dock >> text=Save'); await wait(page);
ok('batter recipe saved, listed under Costed items', await title(page) === 'Costs' && (await page.locator('.section', { hasText: 'Costed items' }).textContent()).includes('Idly'));
// a new ingredient added from inside a recipe lands in the recipe
await page.click('.section:has-text("Costed items") a.row:has-text("Idly")'); await wait(page);
await page.click('text=Add ingredient'); await page.click('.sheet .sf >> text=New ingredient'); await wait(page);
await page.fill('#ieName', 'Urad dal'); await page.fill('#iePrice', '140'); await page.click('#ieSave'); await wait(page);
ok('new ingredient from a recipe is added to it', (await page.locator('#rdLines .rline').count()) === 2 && await title(page) === 'Idly');
answer = 'accept';
await page.click('.bar .back'); await wait(page);
ok('Urad dal stays in the list though the recipe edit was discarded', await ev(page, () => !!ingByName('Urad dal')) && await ev(page, () => recipeById(itemRecipeId('batter', S.menus.batter.filter(i => i.name === 'Idly')[0].id)).lines.length === 1));

// monthly report: opens, arrows step months, next is off on this month
await page.click('a.owedrow:has-text("Monthly report")'); await wait(page);
ok('monthly report opens on this month', (await page.textContent('#app')).includes('October 2026'));
ok('next month is off on this month', await page.locator('button[aria-label="Next month"]').isDisabled());
await page.click('button[aria-label="Previous month"]'); await wait(page);
ok('previous month steps back', (await page.textContent('#app')).includes('September 2026'));
await page.click('.bar .back'); await wait(page);
ok('Back from the report goes to Costs', await title(page) === 'Costs');

ok('no page errors', errors.length === 0, errors.join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
