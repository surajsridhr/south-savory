import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'screenshots/weight-collapse');
const URL = 'http://localhost:8899/south-savory-tally.html';

async function shot(page, name) {
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

  await page.addInitScript(() => {
    const seed = {
      version: 1, chan: 'group', days: {}, batter: {},
      migSpecialDrops: 1, migSpecialDeliveryDate: 1,
      special: {
        drop_ragi: {
          id: 'drop_ragi', title: 'Ragi malt batch', deliveryDate: '2026-09-20', createdAt: Date.now(),
          items: [
            { id: 'rm1kg', n: 'Ragi malt', u: 'kg', p: 300 },
            { id: 'rm500g', n: 'Ragi malt', u: '½ kg', p: 150 },
            { id: 'rm250g', n: 'Ragi malt', u: '250 g', p: 75 }
          ],
          slips: [{ id: 's1', t: Date.now() - 1000, ch: 'group', name: 'Existing Customer', items: { rm250g: 2, rm1kg: 1 }, collected: false, paid: false }],
          orders: [], reopens: []
        },
        drop_widget: {
          // a deliberately non-food name, to show the migration is generic —
          // and this one CAN'T be safely collapsed (no clean rate), so it should
          // show up in the History notice instead of being silently repriced
          id: 'drop_widget', title: 'Widget batch', deliveryDate: '2026-09-21', createdAt: Date.now(),
          items: [
            { id: 'wA1kg', n: 'Widget A', u: 'kg', p: 300 },
            { id: 'wA250g', n: 'Widget A', u: '250 g', p: 70 }
          ],
          slips: [{ id: 's2', t: Date.now() - 1000, ch: 'dm', name: 'Widget Fan', items: { wA250g: 4 }, collected: false, paid: true }],
          orders: [], reopens: []
        }
      }
    };
    localStorage.setItem('southsavory.v1', JSON.stringify(seed));
  });

  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => { xTarget = 'drop_ragi'; go('specialdetail'); });
  await shot(page, '01-ragi-malt-collapsed-to-one-item');

  await page.click('text=+ Add order');
  await shot(page, '02-order-form-just-customer-and-weight');

  await page.evaluate(() => { hideXSlip(); go('history'); });
  await shot(page, '03-history-flags-the-uncollapsible-widget-drop');

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
