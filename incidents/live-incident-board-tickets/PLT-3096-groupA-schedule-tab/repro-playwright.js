const { chromium } = require('playwright-core');
const fs = require('fs');

const JWT = fs.readFileSync('/tmp/tok.txt', 'utf8').trim();
const ATL05 = '4696d14d-fbe6-4f47-b655-2015dff75b81';
const BASE = 'https://cloud.xyzreality.com';

function findExe() {
  const cands = ['/opt/pw-browsers/chromium',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium-1194/chrome-linux/headless_shell'];
  for (const c of cands) { try { fs.accessSync(c, fs.constants.X_OK); const st = fs.statSync(c); if (st.isFile()) return c; } catch (e) {} }
  // walk
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = d + '/' + f.name;
      if (f.isDirectory()) { const r = walk(p); if (r) return r; }
      else if ((f.name === 'chrome' || f.name === 'headless_shell')) return p;
    }
    return null;
  };
  return walk('/opt/pw-browsers');
}

(async () => {
  const exe = findExe();
  console.log('chromium exe:', exe);
  const browser = await chromium.launch({
    executablePath: exe, headless: true,
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--disable-features=PostQuantumKyber,UseMLKEM,EncryptedClientHello,X25519MLKEM768', '--disable-features=PostQuantumKyber,UseMLKEM,EncryptedClientHello,X25519MLKEM768'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1900, height: 1000 }, ignoreHTTPSErrors: true });
  const flags = encodeURIComponent(JSON.stringify([
    { name: 'enableGlobalWebViewerAPI', value: true },
  ]));
  await ctx.addCookies([
    { name: 'access_token', value: JWT, domain: 'cloud.xyzreality.com', path: '/' },
    { name: 'feature-flags', value: flags, domain: 'cloud.xyzreality.com', path: '/' },
  ]);
  await ctx.route('**/*', async route => {
    try {
      const resp = await ctx.request.fetch(route.request(), { timeout: 60000, maxRedirects: 0 });
      await route.fulfill({ response: resp });
    } catch (e) { try { await route.abort(); } catch (_) {} }
  });
  const page = await ctx.newPage();
  page.on('console', m => { const t = m.text(); if (t.includes('[3096]')) console.log('PAGE:', t); });
  page.on('pageerror', e => console.log('PAGEERROR:', String(e).slice(0, 200)));

  console.log('navigating to viewer...');
  await page.goto(`${BASE}/projects/${ATL05}/editor`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(15000);
  console.log('url now:', page.url());
  await page.screenshot({ path: '/tmp/3096_1_loaded.png' });

  // Open the Schedule panel if collapsed - look for a "Schedule" toggle
  const sched = page.locator('text=Schedule').first();
  if (await sched.count()) {
    try { await sched.click({ timeout: 5000 }); console.log('clicked Schedule toggle'); } catch (e) { console.log('schedule click failed:', String(e).slice(0, 120)); }
  }
  await page.waitForTimeout(8000);
  await page.screenshot({ path: '/tmp/3096_2_schedule.png' });

  // wait for gantt rows
  try {
    await page.waitForSelector('.gantt_tree_icon', { timeout: 60000 });
  } catch (e) {
    console.log('no gantt icons appeared; dumping body classes');
    console.log(await page.evaluate(() => document.body.innerText.slice(0, 600)));
    await page.screenshot({ path: '/tmp/3096_fail.png' });
    await browser.close();
    return;
  }

  const dump = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('.gantt_grid_data .gantt_row')];
    return rows.slice(0, 25).map(r => {
      const icon = r.querySelector('.gantt_tree_icon.gantt_open, .gantt_tree_icon.gantt_close');
      const cls = icon ? (icon.className.includes('gantt_close') ? 'OPEN(close-icon)' : 'CLOSED(open-icon)') : 'leaf';
      const txt = (r.innerText || '').split('\n')[0].slice(0, 40);
      return `${r.getAttribute('task_id')} | ${cls} | ${txt}`;
    });
  });

  console.log('--- initial rows ---');
  console.log((await dump()).join('\n'));

  // find two collapsible WBS rows (icons with gantt_close = currently open)
  const info = await page.evaluate(() => {
    const out = [];
    for (const r of document.querySelectorAll('.gantt_grid_data .gantt_row')) {
      const icon = r.querySelector('.gantt_tree_icon.gantt_close');
      if (icon) out.push({ id: r.getAttribute('task_id'), text: (r.innerText || '').split('\n')[0].slice(0, 40) });
      if (out.length >= 6) break;
    }
    return out;
  });
  console.log('collapsible rows:', JSON.stringify(info));
  if (info.length < 3) { console.log('not enough rows to test'); await browser.close(); return; }

  // Use rows 1 and 2 (skip root at 0) like the customer did
  const A = info[1], B = info[2];
  console.log(`A=${A.text} (${A.id})  B=${B.text} (${B.id})`);

  const state = async (id) => page.evaluate((tid) => {
    const r = document.querySelector(`.gantt_grid_data .gantt_row[task_id="${tid}"]`);
    if (!r) return 'row-gone';
    const icon = r.querySelector('.gantt_tree_icon.gantt_open, .gantt_tree_icon.gantt_close');
    return icon ? (icon.className.includes('gantt_close') ? 'OPEN' : 'CLOSED') : 'leaf';
  }, id);

  const clickExpander = async (id) => {
    await page.evaluate((tid) => {
      const r = document.querySelector(`.gantt_grid_data .gantt_row[task_id="${tid}"]`);
      const icon = r && r.querySelector('.gantt_tree_icon.gantt_open, .gantt_tree_icon.gantt_close');
      if (icon) icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, id);
  };

  console.log('STEP 1: collapse A');
  await clickExpander(A.id);
  await page.waitForTimeout(1200);
  console.log(`after: A=${await state(A.id)} B=${await state(B.id)}`);
  await page.screenshot({ path: '/tmp/3096_3_afterA.png' });

  console.log('STEP 2: collapse B');
  await clickExpander(B.id);
  await page.waitForTimeout(300);
  console.log(`+300ms: A=${await state(A.id)} B=${await state(B.id)}`);
  await page.waitForTimeout(1500);
  console.log(`+1800ms: A=${await state(A.id)} B=${await state(B.id)}`);
  await page.screenshot({ path: '/tmp/3096_4_afterB.png' });

  console.log('--- final rows ---');
  console.log((await dump()).join('\n'));

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
