import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'screenshots/after');
const URL = 'http://localhost:8899/south-savory-tally.html';

async function shot(page, name) {
  await page.waitForTimeout(80);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  return h;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(URL, { waitUntil: 'load' });

  const heights = {};
  await page.evaluate(() => go('menu'));
  heights['01-menu-decide'] = await shot(page, '01-menu-decide');
  heights['02-menu-browse-all'] = await (async () => { await page.evaluate(() => toggleBrowse()); return shot(page, '02-menu-browse-all'); })();
  await page.evaluate(() => { toggleBrowse(); pickDish('Pudina Rice'); }); // preview, don't save yet
  heights['01b-menu-confirm-pinned'] = await shot(page, '01b-menu-confirm-pinned');
  await page.evaluate(() => saveMenu());

  heights['03-today-orders'] = await shot(page, '03-today-orders');
  heights['04-today-name-order'] = await (async () => {
    await page.evaluate(() => { const d = day(); showSlip(null, tilesFor(d)[0].k); });
    return shot(page, '04-today-name-order');
  })();
  await page.evaluate(() => { const f = document.getElementById('xslipform')||document.querySelector('.addbox'); });
  heights['05-today-post-open'] = await (async () => { await page.evaluate(() => toggleFold('post')); return shot(page, '05-today-post-open'); })();
  heights['06-today-margin-open'] = await (async () => { await page.evaluate(() => toggleFold('margin')); return shot(page, '06-today-margin-open'); })();

  heights['07-costs-default'] = await (async () => { await page.evaluate(() => go('costs')); return shot(page, '07-costs-default'); })();
  heights['08-costs-other-dishes'] = await (async () => {
    await page.evaluate(() => { const b = [...document.querySelectorAll('.disc')].find(x => /Other dishes/.test(x.textContent)); b.click(); });
    return shot(page, '08-costs-other-dishes');
  })();
  heights['09-costs-all-prices'] = await (async () => {
    await page.evaluate(() => { const b = [...document.querySelectorAll('.disc')].find(x => /All ingredient prices/.test(x.textContent)); b.click(); });
    return shot(page, '09-costs-all-prices');
  })();
  heights['10-costs-overheads'] = await (async () => {
    await page.evaluate(() => { const b = [...document.querySelectorAll('.disc')].find(x => /Overheads/.test(x.textContent)); b.click(); });
    return shot(page, '10-costs-overheads');
  })();

  heights['11-history'] = await (async () => { await page.evaluate(() => go('history')); return shot(page, '11-history'); })();
  heights['12-month'] = await (async () => { await page.evaluate(() => go('month')); return shot(page, '12-month'); })();

  heights['13-batter'] = await (async () => { await page.evaluate(() => { go('today'); setLine('batter'); }); return shot(page, '13-batter'); })();
  heights['14-batter-setup'] = await (async () => { await page.evaluate(() => go('batterset')); return shot(page, '14-batter-setup'); })();

  heights['15-specials'] = await (async () => { await page.evaluate(() => { go('today'); setLine('special'); }); return shot(page, '15-specials'); })();
  heights['16-specials-setup'] = await (async () => { await page.evaluate(() => go('specialset')); return shot(page, '16-specials-setup'); })();

  heights['17-today-full-again'] = await (async () => { await page.evaluate(() => { go('today'); setLine('lunch'); }); return shot(page, '17-today-full-again'); })();

  writeFileSync(path.join(OUT, '_heights.txt'),
    Object.keys(heights).map(k => k + ': ' + heights[k] + 'px  (' + (heights[k]/844).toFixed(2) + ' screens)').join('\n') + '\n');

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
