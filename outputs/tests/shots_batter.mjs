import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'screenshots/batter-parity');
const URL = 'http://localhost:8899/south-savory-tally.html';

async function shot(page, name) {
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(URL, { waitUntil: 'load' });

  await page.evaluate(() => {
    go('today'); setLine('batter');
    initBatterDraft();
    bdraft.type = 'Idly'; bdraft.plain = true; bdraft.special = true; bdraft.top = true;
    bdraft.date = shiftDate(todayKey(), 2);
    saveBatter();
  });
  await page.evaluate(() => { go('today'); setLine('batter'); });
  await shot(page, '01-batter-empty-to-make');

  await page.click('text=+ Add order');
  await page.fill('#bslName', 'Priya');
  await shot(page, '02-add-order-form');

  await page.click('#bslItems .oline:nth-of-type(2) .plus'); // Plain 1kg
  await page.click('#bslItems .oline:nth-of-type(2) .plus');
  await shot(page, '03-stepper-two-taps');

  await page.click('#bsl-d'); // DM channel
  await shot(page, '04-channel-toggle-dm');

  await page.click('#bslipform >> text=Add order');
  await shot(page, '05-slip-list-after-save');

  // second order, then mark delivered/paid to show both ticks together
  await page.click('text=+ Add order');
  await page.fill('#bslName', 'Ramesh');
  await page.click('#bslItems .oline:nth-of-type(4) .plus'); // special half + top, whichever line 4 is
  await page.click('#bslipform >> text=Add order');
  await shot(page, '06-two-named-orders');

  await page.evaluate(() => {
    const b = activeBatter();
    bToggleCollected(b.slips[0].id); // Priya: delivered, still unpaid -> orange
    bToggleCollected(b.slips[1].id); bTogglePaid(b.slips[1].id); // Ramesh: delivered + paid -> green
  });
  await shot(page, '07-both-tick-states');

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
