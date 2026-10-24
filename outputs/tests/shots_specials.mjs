import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'screenshots/after-specials');
const URL = 'http://localhost:8899/south-savory-tally.html';

async function shot(page, name) {
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(URL, { waitUntil: 'load' });

  await page.evaluate(() => { go('today'); setLine('special'); });
  await shot(page, '01-specials-empty');

  // create two concurrent drops, as in Suraj's own example
  await page.evaluate(() => {
    xNewDrop();
  });
  await shot(page, '02-new-drop-form');

  await page.evaluate(() => {
    xdraft.title = 'Ganesh Chaturthi';
    addXItem('Modak', 'piece', 15);
    addXItem('Kosambari', 'plate', 40);
    renderSpecialSet();
  });
  await shot(page, '03-new-drop-with-items');

  await page.evaluate(() => { saveSpecial(); });
  await shot(page, '04-drop-detail-empty');

  await page.evaluate(() => { showXSlip(); });
  await shot(page, '05-add-order-form');

  await page.evaluate(() => {
    const d = currentDrop();
    xSlipDraft[d.items[0].id] = 10;
    xSlipDraft[d.items[1].id] = 4;
    renderXSlipItems();
    document.getElementById('xslName').value = 'Priya';
  });
  await shot(page, '06-add-order-filled');

  await page.evaluate(() => { saveXSlip(); });
  await shot(page, '07-drop-detail-with-order');

  // second, independent drop — open at the same time
  const dropA = await page.evaluate(() => xTarget);
  await page.evaluate(() => { go('today'); xNewDrop(); xdraft.title = 'Ragi malt batch'; addXItem('Ragi malt', 'kg', 250); saveSpecial(); });
  await page.evaluate(() => { showXSlip(); document.getElementById('xslName').value = 'Neighbour Y'; const d = currentDrop(); xSlipDraft[d.items[0].id] = 2; renderXSlipItems(); saveXSlip(); });
  await shot(page, '08-second-drop-with-order');

  await page.evaluate(() => { go('today'); });
  await shot(page, '09-specials-list-two-open');

  // close the first drop, confirm the second stays open in the list
  await page.evaluate((id) => { xTarget = id; doCloseSpecial(); go('today'); }, dropA);
  await shot(page, '10-specials-list-one-closed');

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.disc')].find(b => /Closed drops/.test(b.textContent));
    btn.click();
  });
  await shot(page, '11-closed-drops-expanded');

  // month report shows drops as separate lines
  await page.evaluate(() => { go('month'); });
  await shot(page, '12-month-report-drops');

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
