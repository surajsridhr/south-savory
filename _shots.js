// Screenshot harness for South Savory. Usage: node _shots.js <outDir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = process.argv[2];
const URL = 'http://localhost:8899/south-savory-tally.html';
if (!OUT) { console.error('need outdir'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const log = [];
async function shot(page, name) {
  const p = path.join(OUT, name + '.png');
  await page.waitForTimeout(260);
  await page.screenshot({ path: p, fullPage: true });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => innerHeight);
  log.push(`${name}: ${h}px  (${(h / vh).toFixed(2)} screens)`);
  console.log(log[log.length - 1]);
}
const click = async (page, sel) => { try { await page.click(sel, { timeout: 2500 }); await page.waitForTimeout(200); } catch (e) { console.log('  skip ' + sel); } };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('!! PAGE ERROR: ' + e.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // ---- seed a realistic day: pick the top menu, then log orders ----
  await click(page, '#tab-menu');
  await page.waitForTimeout(300);
  await shot(page, '01-menu-decide');
  await click(page, '#browseBtn');
  await shot(page, '02-menu-browse-all');
  await click(page, '#browseBtn');

  // use the top pick
  await click(page, '.scard .use');
  await page.waitForTimeout(400);

  // log a spread of orders across the steppers
  await page.evaluate(() => {
    const plus = [...document.querySelectorAll('#tiles .ol-btn.plus')];
    plus.forEach((b, i) => { for (let k = 0; k < (i === 0 ? 5 : i === 1 ? 4 : 2); k++) b.click(); });
  });
  await page.waitForTimeout(400);
  await shot(page, '03-today-orders');

  // named order / door
  await click(page, '#tiles .ol-quick');
  await shot(page, '04-today-name-order');
  await page.keyboard.press('Escape');
  await click(page, '#tab-today');

  // expand the folds
  await click(page, '#fold-post'); await shot(page, '05-today-post-open'); await click(page, '#fold-post');
  await click(page, '#fold-margin'); await shot(page, '06-today-margin-open'); await click(page, '#fold-margin');

  await click(page, '#tab-costs');
  await shot(page, '07-costs-default');
  await click(page, 'text=Other dishes');
  await shot(page, '08-costs-other-dishes');
  await click(page, 'text=Other dishes');
  await click(page, 'text=All ingredient prices');
  await shot(page, '09-costs-all-prices');
  await click(page, 'text=All ingredient prices');
  await click(page, 'text=Overheads');
  await shot(page, '10-costs-overheads');

  await click(page, '#tab-history');
  await shot(page, '11-history');
  await click(page, 'text=Monthly report');
  await shot(page, '12-month');

  // batter lane
  await click(page, '#tab-today');
  await click(page, '#line-batter');
  await shot(page, '13-batter');
  await click(page, 'text=Set up a batter batch');
  await click(page, 'text=Edit this batch');
  await shot(page, '14-batter-setup');

  // specials lane
  await click(page, '#tab-today');
  await click(page, '#line-special');
  await shot(page, '15-specials');
  await click(page, 'text=Set up a special menu');
  await shot(page, '16-specials-setup');

  await click(page, '#tab-today');
  await click(page, '#line-lunch');
  await shot(page, '17-today-full-again');

  fs.writeFileSync(path.join(OUT, '_heights.txt'), log.join('\n'));
  await browser.close();
})();
