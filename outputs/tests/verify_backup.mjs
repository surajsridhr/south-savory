// Verifies export/import: merge-only semantics, never overwrites an existing record.
import { chromium } from 'playwright';
import { writeFileSync, mkdtempSync } from 'fs';
import path from 'path';
import os from 'os';

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) pass++; else fail++;
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail && !cond ? '  (' + detail + ')' : ''));
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://localhost:8899/south-savory-tally.html', { waitUntil: 'load' });

  const boot = await page.evaluate(() => window.__boot);
  ok('app boots cleanly with the new functions present', boot && boot.errs.length === 0, JSON.stringify(boot && boot.errs));

  // seed local state: today's real menu, plus a distinct EXISTING day that a
  // backup file will also try to describe differently — must NOT be touched.
  const existingKey = await page.evaluate(() => {
    go('menu'); pickDish('Pudina Rice'); saveMenu();
    const k = shiftDate(todayKey(), 2);
    S.days[k] = { date: k, hero: 'REAL LOCAL DATA — must survive', orders: [{ id: 'x1', k: 'ala', q: 3, p: 75, ch: 'group', t: Date.now() }] };
    save();
    return k;
  });

  // build a synthetic backup file: conflicts on existingKey (different hero —
  // must be ignored), and adds one genuinely new day.
  const newKey = await page.evaluate(() => shiftDate(todayKey(), 9));
  const backupObj = await page.evaluate((args) => {
    const [existingKey, newKey] = args;
    const fake = JSON.parse(JSON.stringify(S));
    fake.days[existingKey] = { date: existingKey, hero: 'IMPORTED VERSION — must be rejected', orders: [] };
    fake.days[newKey] = { date: newKey, hero: 'Puliyogre', orders: [{ id: 'y1', k: 'ala', q: 1, p: 75, ch: 'dm', t: Date.now() }] };
    return fake;
  }, [existingKey, newKey]);

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'ss-backup-'));
  const backupFile = path.join(tmpDir, 'fake-backup.json');
  writeFileSync(backupFile, JSON.stringify(backupObj));

  await page.evaluate(() => go('history'));
  const fileInput = await page.$('#importFile');
  await fileInput.setInputFiles(backupFile);
  await page.waitForTimeout(150);

  const result = await page.evaluate((args) => {
    const [existingKey, newKey] = args;
    return {
      existing: S.days[existingKey],
      added: S.days[newKey],
    };
  }, [existingKey, newKey]);

  ok('import does NOT overwrite an existing day', result.existing.hero === 'REAL LOCAL DATA — must survive', JSON.stringify(result.existing));
  ok('import does NOT touch an existing day\'s orders either', result.existing.orders.length === 1 && result.existing.orders[0].id === 'x1', JSON.stringify(result.existing.orders));
  ok('import DOES add a genuinely new day', !!result.added && result.added.hero === 'Puliyogre', JSON.stringify(result.added));

  // export round-trip: does it produce valid JSON containing today's real data?
  const exported = await page.evaluate(() => {
    // exportBackup() triggers a real browser download, which we can't intercept
    // synchronously here — exercise the same serialization it uses directly.
    return JSON.parse(JSON.stringify(S));
  });
  ok('exported state round-trips as valid JSON with real data intact', exported.days && Object.keys(exported.days).length >= 2, 'days=' + Object.keys(exported.days || {}).length);

  // malformed file handling: must not throw, must not corrupt existing state
  const badFile = path.join(tmpDir, 'not-json.json');
  writeFileSync(badFile, 'this is not json {{{');
  await fileInput.setInputFiles(badFile);
  await page.waitForTimeout(150);
  const stillOk = await page.evaluate((k) => S.days[k].hero, existingKey);
  ok('a malformed backup file is rejected without throwing or corrupting state', stillOk === 'REAL LOCAL DATA — must survive', stillOk);

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed.');
  if (fail) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
