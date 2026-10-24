import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'screenshots/after-brandbar');
const URL = 'http://localhost:8899/south-savory-tally.html';

async function shot(page, name) {
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(OUT, name + '.png') }); // viewport only, not fullPage — we want to see the fixed header in context
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(URL, { waitUntil: 'load' });

  await page.evaluate(() => { go('menu'); pickDish('Pudina Rice'); saveMenu(); });
  await page.evaluate(() => { go('today'); setLine('lunch'); });
  await shot(page, '01-lunch');

  await page.evaluate(() => setLine('batter'));
  await shot(page, '02-batter');

  await page.evaluate(() => setLine('special'));
  await shot(page, '03-specials');

  await page.evaluate(() => go('costs'));
  await shot(page, '04-costs');

  await page.evaluate(() => go('history'));
  await shot(page, '05-history');

  await page.evaluate(() => go('month'));
  await shot(page, '06-month');

  // scrolled state on "today" — confirm the bar stays fixed while content scrolls under it
  await page.evaluate(() => { go('today'); window.scrollTo(0, 400); });
  await shot(page, '07-lunch-scrolled');

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
