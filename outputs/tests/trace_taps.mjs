import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'screenshots/tap-trace');
const URL = 'http://localhost:8899/south-savory-tally.html';

async function shot(page, name) {
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

  // ---- fresh app open, no prior state ----
  await page.goto(URL, { waitUntil: 'load' });
  await shot(page, '00-app-open');

  // tap 1: the "Specials" tab within the line-of-business row on the home screen
  const specialsTabVisible = await page.isVisible('#line-special');
  await page.click('#line-special');
  await shot(page, '01-tap1-specials-tab');

  // tap 2: "+ New drop"
  const newDropVisible = await page.isVisible('text=+ New drop');
  await page.click('text=+ New drop');
  await shot(page, '02-tap2-new-drop-form');

  // fill + tap 3: "Add item" opens the add-item box (not counted as a nav tap, it's data entry)
  await page.fill('#xs-title', 'Trace test drop');
  await page.click('#xsAddBtn');
  await page.fill('#xs-name', 'Ragi malt');
  await page.fill('#xs-price', '250');
  await page.click('#v-specialset button.btn.solid');
  await shot(page, '03-item-added');

  // tap: "+ Sizes for this item" — is it visible without scrolling?
  const addSizeBox = await page.$('.xsz-addsize');
  const addSizeVisible = addSizeBox ? await addSizeBox.isVisible() : false;
  const addSizeBox2 = await addSizeBox.boundingBox();
  await page.click('.xsz-addsize');
  await shot(page, '04-tap-add-sizes');

  await page.fill('.xsz-row[data-si="0"] .xsz-label', '100g');
  await page.fill('.xsz-row[data-si="0"] .xsz-price', '60');

  // tap: save/open the drop
  await page.click('#xs-confirm .cb-go');
  await shot(page, '05-drop-open');

  // now: from home (today), how many taps to Pickups?
  await page.evaluate(() => go('today'));
  await shot(page, '06-back-at-home');
  const pickupsBtnVisible = await page.isVisible('text=Today\'s pickups');
  const specialsListNeeded = !(await page.isVisible('text=Today\'s pickups')); // is specials tab already active?
  await page.click('#line-special');
  await shot(page, '07-specials-tab-again');
  const pickupsVisibleNow = await page.isVisible('text=Today\'s pickups');
  await page.click('text=Today\'s pickups');
  await shot(page, '08-pickups-view');

  console.log(JSON.stringify({
    specialsTabVisibleOnOpen: specialsTabVisible,
    newDropVisibleAfterTab: newDropVisible,
    addSizeVisibleWithoutScroll: addSizeVisible,
    addSizeBoxY: addSizeBox2 ? addSizeBox2.y : null,
    pickupsVisibleOnSpecialsTab: pickupsVisibleNow
  }, null, 2));

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
