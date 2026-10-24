import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'screenshots/after-sizes');
const URL = 'http://localhost:8899/south-savory-tally.html';

async function shot(page, name) {
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(URL, { waitUntil: 'load' });

  await page.evaluate(() => { go('today'); setLine('special'); xNewDrop(); });
  await page.fill('#xs-title', 'Ragi malt batch');
  await page.click('#xsAddBtn');
  await page.fill('#xs-name', 'Ragi malt');
  await page.fill('#xs-price', '250');
  await page.click('#v-specialset button.btn.solid'); // "Add" inside the add-item box
  await shot(page, '01-plain-item-added');

  // turn it into a sized item, via the real UI affordance
  await page.click('.xsz-addsize');
  await shot(page, '02-first-size-added-prefilled');

  await page.fill('.xsz-row[data-si="0"] .xsz-label', '100g');
  await page.fill('.xsz-row[data-si="0"] .xsz-price', '60');
  await page.click('.xsz-addsize');
  await page.fill('.xsz-row[data-si="1"] .xsz-label', '250g');
  await page.fill('.xsz-row[data-si="1"] .xsz-price', '130');
  await shot(page, '03-two-sizes-priced-independently');

  await page.click('#xs-confirm .cb-go'); // "Open this drop →"
  await shot(page, '04-drop-detail-shows-both-sizes-in-to-make');

  await page.click('text=+ Add order');
  await page.fill('#xslName', 'Multi-size Customer');
  await shot(page, '05-order-form-shows-both-sizes-as-separate-lines');

  // one tap per unit, per size — tap 100g twice, 250g once. Each render replaces
  // the row DOM, so re-query fresh before every click rather than caching handles.
  await page.click('#xslItems .oline:nth-child(1) .plus');
  await page.click('#xslItems .oline:nth-child(1) .plus');
  await page.click('#xslItems .oline:nth-child(2) .plus');
  await shot(page, '06-two-taps-100g-one-tap-250g');

  await page.click('#xslipform >> text=Add order');
  await shot(page, '07-drop-total-reflects-both-sizes');

  // a plain per-piece item, added to the same drop, stays untouched
  await page.click('text=Edit this drop');
  await page.click('#xsAddBtn');
  await page.fill('#xs-name', 'Obbattu');
  await page.fill('#xs-price', '20');
  await page.click('#v-specialset button.btn.solid');
  await shot(page, '08-plain-item-alongside-sized-item');
  await page.click('#xs-confirm .cb-go');

  // pickups view: item, size and quantity readable at the door
  await page.evaluate(() => { collectDate = currentDrop().deliveryDate; go('specialcollect'); });
  await shot(page, '09-pickups-shows-item-size-qty');

  await page.evaluate(() => { go('month'); });
  await shot(page, '10-month-report-per-size-revenue');

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
