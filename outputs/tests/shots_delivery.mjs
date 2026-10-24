import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'screenshots/after-delivery');
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
  await shot(page, '01-new-drop-form-with-delivery-date');

  // Ganesh Chaturthi — due Sunday (in 3 days, whatever today is)
  const sharedDay = await page.evaluate(() => {
    const shared = shiftDate(todayKey(), 3);
    xdraft.title = 'Ganesh Chaturthi';
    xdraft.deliveryDate = shared;
    addXItem('Modak', 'piece', 15);
    addXItem('Kosambari', 'plate', 40);
    renderSpecialSet();
    return shared;
  });
  await shot(page, '02-ganesh-chaturthi-delivery-set');

  await page.evaluate(() => { saveSpecial(); showXSlip(); document.getElementById('xslName').value = 'Priya'; const d = currentDrop(); xSlipDraft[d.items[0].id] = 10; renderXSlipItems(); saveXSlip(); });
  await shot(page, '03-drop-detail-shows-pickup-date');

  // Ragi malt — due today
  await page.evaluate(() => { go('today'); xNewDrop(); xdraft.title = 'Ragi malt batch'; addXItem('Ragi malt', 'kg', 250); saveSpecial(); showXSlip(); document.getElementById('xslName').value = 'Neighbour Y'; const d = currentDrop(); xSlipDraft[d.items[0].id] = 2; renderXSlipItems(); saveXSlip(); });
  await shot(page, '04-second-drop-due-today');

  await page.evaluate(() => { go('today'); });
  await shot(page, '05-list-ordered-by-delivery-today-first');

  // a third drop sharing Ganesh Chaturthi's delivery day
  await page.evaluate((shared) => {
    go('today'); xNewDrop(); xdraft.title = 'Chakli batch'; xdraft.deliveryDate = shared;
    addXItem('Chakli', 'packet', 60); saveSpecial();
    showXSlip(); document.getElementById('xslName').value = 'Door Customer 2';
    const d = currentDrop(); xSlipDraft[d.items[0].id] = 3; renderXSlipItems(); saveXSlip();
  }, sharedDay);
  await shot(page, '06-third-drop-shares-ganesh-chaturthi-day');

  // the pickups view: two drops due the same day, both visible, independent paid toggles
  await page.evaluate((shared) => { collectDate = shared; go('specialcollect'); }, sharedDay);
  await shot(page, '07-pickups-two-drops-same-day');

  await page.evaluate(() => { stepCollectDay(-3); }); // step back to today's pickup (ragi malt)
  await shot(page, '08-pickups-today');

  // edit a drop's delivery date after the fact
  await page.evaluate(() => { go('today'); const k = openDropKeys().find(id => S.special[id].title === 'Ragi malt batch'); xTarget = k; go('specialdetail'); xEditDrop(); });
  await shot(page, '09-edit-drop-delivery-date');

  await page.evaluate((shared) => { xdraft.deliveryDate = shifted(shared); function shifted(s){ return shiftDate(s, 1); } saveSpecial(); }, sharedDay);
  await page.evaluate(() => { go('today'); });
  await shot(page, '10-list-after-moving-delivery-date');

  // month report: revenue attributed to delivery date
  await page.evaluate(() => { go('month'); });
  await shot(page, '11-month-report-by-delivery-date');

  await browser.close();
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
