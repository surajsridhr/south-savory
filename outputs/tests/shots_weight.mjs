import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'screenshots/weight-pricing');
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
  await page.click('.arch button:has-text("kg")');
  await page.fill('#xs-price', '250');
  await page.click('#v-specialset button.btn.solid');
  await shot(page, '01-item-added-flat-mode');

  await page.click('.xsz-switchweight');
  await shot(page, '02-switched-to-weight-mode');

  await page.fill('.xsz-item .crow input', '300');
  await page.dispatchEvent('.xsz-item .crow input', 'change');
  await shot(page, '03-rate-entered');

  await page.click('#xs-confirm .cb-go');
  await shot(page, '04-drop-detail-opened');

  await page.click('text=+ Add order');
  await page.fill('#xslName', 'Weight Buyer');
  await shot(page, '05-order-form-weight-presets-with-computed-prices');

  await page.click('#xslItems .oline:nth-of-type(2) .plus'); // 250g line
  await shot(page, '06-tapped-250g-shows-computed-price');

  await page.click('#xslItems .oline:nth-of-type(2) .plus'); // tap again -> 2x250g
  await shot(page, '07-tapped-250g-again-qty-2');

  await page.fill('#xslItems .xcg-input', '375');
  await page.click('#xslItems .xcg-add');
  await shot(page, '08-custom-grams-375-added');

  await page.click('#xslipform >> text=Add order');
  await shot(page, '09-drop-total-and-to-make-weight');

  // scroll to see "to prepare" weight rollup and margin
  await page.evaluate(() => window.scrollTo(0, 500));
  await shot(page, '10-to-prepare-total-weight');

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
