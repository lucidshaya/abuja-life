// Renders the first-time tutorial pictures from the game itself.
// Usage: npm run build && npx vite preview --port 4173 & node scripts/tutorial-shots.mjs
import { chromium } from 'playwright-core';

const URL = process.env.URL ?? 'http://localhost:4173/';
const exe = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const set of ['pc', 'mobile']) {
  const mobile = set === 'mobile';
  const ctx = await browser.newContext(mobile ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.5 } : { viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('abuja-life-onboarded-v1', 'tutorial,explore'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('hidden'), null, { timeout: 120000 });
  const click = (sel) => (mobile ? page.tap(sel) : page.click(sel));
  await click('text=New Life');
  await sleep(400);
  await click('.rp-card[data-role="techbro"]');
  await click('.rp-go');
  await sleep(500);
  await click('text=Start Life in Abuja');
  await sleep(2500);
  const G = (fn, arg) => page.evaluate(fn, arg);
  const stage = (x, z, yaw, hour, hud = true) => G(([x, z, yaw, hour, hud]) => {
    const g = window.__abuja;
    g.events.randomTick = () => null;
    g.events.zoneCheck = () => null;
    g.teleport(x, z, yaw);
    g.rig.yaw = yaw + Math.PI;
    g.rig.snapBehind(yaw);
    g.hour = hour;
    document.getElementById('hud').style.visibility = hud ? '' : 'hidden';
    document.getElementById('touch').style.visibility = hud ? '' : 'hidden';
    document.getElementById('quick').style.visibility = hud ? '' : 'hidden';
    for (const id of ['mute', 'phonebtn', 'dancebtn']) document.getElementById(id).style.visibility = hud ? '' : 'hidden';
  }, [x, z, yaw, hour, hud]);
  const shot = async (name) => {
    await sleep(2200);
    await G(() => document.querySelector('.toast')?.classList.add('hidden'));
    await sleep(300);
    await page.screenshot({ path: `public/tutorial/${set}-${name}.jpg`, type: 'jpeg', quality: 72 });
    console.log('saved', set, name);
  };
  await stage(-680, -236.6, Math.PI * 0.62, 17.3, false);
  await shot('welcome');
  await stage(-697, -233.4, Math.PI, 11);
  await shot('controls');
  await stage(20, -10, Math.PI * 0.75, 12);
  await G(() => window.__abuja.openPhone('bank'));
  await shot('phone');
  await G(() => window.__abuja.phone.close());
  await stage(36, -21, Math.PI, 10);
  await shot('work');
  await G(() => { const g = window.__abuja; g.save.home.furniture.push('rug', 'couch', 'tv', 'plants', 'art', 'chandelier', 'shelf'); g.applyFurniture(); });
  await stage(1485, 261.5, Math.atan2(-1, -0.55), 20);
  await shot('home');
  await ctx.close();
}
await browser.close();
