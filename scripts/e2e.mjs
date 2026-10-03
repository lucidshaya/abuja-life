// End-to-end smoke test: desktop keyboard flow + mobile touch flow.
// Usage: npm run build && npx vite preview --port 4173 & node scripts/e2e.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL ?? 'http://localhost:4173/';
const OUT = process.env.OUT ?? 'e2e-shots';
mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Font CDN failures (offline / sandboxed networks) are not game errors.
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('hidden'), null, { timeout: 120000 });
  return errors;
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const pos = (page) => G(page, () => { const g = window.__abuja; const p = g.car ? g.car : g.player; return { x: p.x, z: p.z, state: g.state, inCar: !!g.car }; });
/** Press a key one frame at a time until cond() holds (headless GL can be ~5 fps). */
async function pressUntil(page, key, cond, tries = 8) {
  for (let i = 0; i < tries; i++) {
    if (await cond()) return true;
    await page.keyboard.press(key);
    await sleep(450);
  }
  return cond();
}
const fps = (page) => G(page, () => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));

// ---------------- Desktop ----------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = await boot(page);
  await page.screenshot({ path: `${OUT}/01-menu.png` });
  check('desktop: menu visible', await page.isVisible('#menu'));
  await page.click('text=New Life');
  await sleep(500);
  check('desktop: customizer opens', await page.isVisible('#customizer'));
  await page.click('.cz-tab[data-tab="style"]');
  await page.click('.chip:has-text("Agbada")');
  await sleep(400);
  await page.screenshot({ path: `${OUT}/02-customizer.png` });
  await page.click('text=Start Life in Abuja');
  await sleep(600);
  check('desktop: travel menu shows after New Life', await page.isVisible('#travel'));
  check('desktop: travel menu lists 8 places + start', (await page.locator('.tcard').count()) === 9, String(await page.locator('.tcard').count()));
  await page.screenshot({ path: `${OUT}/02b-travel.png` });
  await page.click('.tcard:has-text("Abuja City Gate")');
  await sleep(1400);
  let p0 = await pos(page);
  check('desktop: playing after customizer', p0.state === 'play', p0.state);
  await page.screenshot({ path: `${OUT}/03-spawn-zuma.png` });
  // Walk forward with W + sprint.
  await page.keyboard.down('KeyW');
  await page.keyboard.down('ShiftLeft');
  await sleep(3000);
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  let p1 = await pos(page);
  const walked = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  check('desktop: W + Shift moves the player', walked > 2, `${walked.toFixed(1)} m`);
  // Jump
  await page.keyboard.press('Space');
  let y = 0;
  for (let i = 0; i < 6; i++) { await sleep(60); y = Math.max(y, await G(page, () => window.__abuja.player.y)); }
  check('desktop: Space jumps', y > 0.05, `y=${y.toFixed(2)}`);
  // Talk to Uncle Emeka.
  await G(page, () => { const g = window.__abuja; g.player.teleport(-697, -233.6, Math.PI); });
  await sleep(300);
  const promptText = await page.textContent('.prompt');
  check('desktop: talk prompt near NPC', !!promptText && promptText.includes('Uncle'), promptText ?? '');
  await page.keyboard.press('KeyE');
  await sleep(600);
  check('desktop: E opens dialogue', await page.isVisible('#dialogue'));
  await pressUntil(page, 'KeyE', () => page.isVisible('.d-choice'));
  await page.screenshot({ path: `${OUT}/04-dialogue.png` });
  await page.keyboard.press('Digit2');
  await sleep(600);
  const tags = await page.textContent('#dialogue');
  check('desktop: number key picks a choice', !!tags && tags.includes('clout'), (tags ?? '').slice(0, 80));
  check('desktop: dialogue closes', await pressUntil(page, 'KeyE', async () => !(await page.isVisible('#dialogue'))));
  // Drive.
  await G(page, () => window.__abuja.player.teleport(-713, -234, Math.PI / 2));
  await sleep(200);
  await pressUntil(page, 'KeyF', async () => (await pos(page)).inCar, 3);
  p0 = await pos(page);
  check('desktop: F enters car', p0.inCar);
  await page.keyboard.down('KeyW');
  await sleep(6000); // headless GL runs the sim in slow motion (dt is capped per frame)
  const spd = await G(page, () => window.__abuja.car?.speed ?? 0);
  await page.screenshot({ path: `${OUT}/05-driving.png` });
  await page.keyboard.up('KeyW');
  p1 = await pos(page);
  const drove = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  check('desktop: W drives the car', drove > 4 && spd > 3, `${drove.toFixed(1)} m, ${(spd * 3.6).toFixed(0)} km/h`);
  await page.keyboard.press('KeyH');
  await sleep(1500);
  await G(page, () => { const c = window.__abuja.car; if (c) c.speed = c.vx = c.vz = 0; });
  check('desktop: F exits car', await pressUntil(page, 'KeyF', async () => !(await pos(page)).inCar, 3));
  // Map
  check('desktop: M opens city map', await pressUntil(page, 'KeyM', () => page.isVisible('#map'), 3));
  await sleep(300);
  await page.screenshot({ path: `${OUT}/06-map.png` });
  await pressUntil(page, 'KeyM', async () => !(await page.isVisible('#map')), 3);
  // ---- New locations ----
  const tp = (x, z, yaw, hour = 13) => G(page, ([x, z, yaw, hour]) => { const g = window.__abuja; g.player.teleport(x, z, yaw); g.rig.snapBehind(yaw); g.hour = hour; for (const e of ['nepa', 'mummy', 'fuel', 'kubwa-jam']) g.events.markFired(e, g.playTime); }, [x, z, yaw, hour]);
  await tp(-680, -236.6, Math.PI * 0.62, 9);
  await sleep(1800);
  await page.screenshot({ path: `${OUT}/15-city-gate.png` });
  // Mall: walk to the door and press E.
  await tp(-195, -66, Math.PI);
  await sleep(500);
  const mallPrompt = await page.textContent('.prompt');
  check('mall: entrance prompt outside', !!mallPrompt && mallPrompt.includes('Jabi Lake Mall'), mallPrompt ?? '');
  await pressUntil(page, 'KeyE', async () => (await pos(page)).x > 1300, 3);
  await sleep(1500);
  const inMall = await G(page, () => ({ x: window.__abuja.player.x, indoor: window.__abuja.indoor?.id }));
  check('mall: E enters the mall interior', inMall.indoor === 'mall', JSON.stringify(inMall));
  await page.screenshot({ path: `${OUT}/16-mall-atrium.png` });
  await tp(1497, -22, Math.PI / 2);
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/17-shopright.png` });
  const crowdOn = await G(page, () => window.__abuja.crowds.dynamics.length);
  check('mall: shoppers walking around', crowdOn > 10, `${crowdOn} people`);
  await tp(1470, 35, 0);
  await sleep(400);
  await pressUntil(page, 'KeyE', async () => (await pos(page)).x < 0, 3);
  await sleep(800);
  check('mall: exit door returns outside', (await pos(page)).x < 0);
  // University, lecture hall, park, club, Guzape.
  await tp(-470, 60, -Math.PI / 2);
  await sleep(1800);
  await page.screenshot({ path: `${OUT}/18-nile-campus.png` });
  await tp(-540, 168, Math.PI * 0.95, 16);
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/19-nile-football.png` });
  await tp(1620, 8, Math.PI, 10);
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/19b-lecture-theatre.png` });
  await tp(250, -205, Math.PI, 16.5);
  await sleep(1800);
  await page.screenshot({ path: `${OUT}/19c-millennium-park.png` });
  await tp(205, -244, Math.PI * 1.15, 11);
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/19d-park-wedding.png` });
  await tp(85, -68.6, Math.PI, 22);
  await sleep(500);
  await pressUntil(page, 'KeyE', async () => (await pos(page)).x > 1300, 2);
  check('cage: bouncer blocks first-timers', (await pos(page)).x < 1300);
  await G(page, () => window.__abuja.flags.add('cageRegular'));
  await pressUntil(page, 'KeyE', async () => (await pos(page)).x > 1300, 3);
  await sleep(1500);
  check('cage: regulars get in at night', (await pos(page)).x > 1300);
  await page.screenshot({ path: `${OUT}/19e-the-cage.png` });
  await tp(430, 250, Math.PI / 2, 17.5);
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/19f-guzape.png` });
  // Mute button.
  await pressUntil(page, 'KeyN', () => G(page, () => window.__abuja.save.settings.muted === true), 3);
  check('audio: N key mutes', await G(page, () => window.__abuja.save.settings.muted === true && document.getElementById('mute').classList.contains('muted')));
  await pressUntil(page, 'KeyP', () => page.isVisible('#pause'), 3);
  await page.click('#mute');
  await sleep(300);
  check('audio: mute button unmutes', await G(page, () => window.__abuja.save.settings.muted === false));
  // Fast travel from the pause menu.
  await page.click('#pause >> text=Fast Travel');
  await sleep(300);
  await page.click('.tcard:has-text("Millennium Park")');
  await sleep(1500);
  const pk = await pos(page);
  check('travel: pause → Fast Travel → Millennium Park', Math.hypot(pk.x - 250, pk.z + 142) < 3 && pk.state === 'play', JSON.stringify(pk));
  // District tour screenshots.
  const tour = [
    ['07-wuse2', 20, -10, Math.PI * 0.75, 14],
    ['08-central-mosque', 160, -140, Math.PI * 0.2, 16],
    ['09-jabi-lake', -255, -60, 0, 17.5],
    ['10-area1', 30, 215, -Math.PI * 0.8, 11],
    ['11-maitama', 20, -238, -Math.PI * 0.6, 10],
    ['12-wuse2-night', 30, -6, Math.PI * 0.85, 21.5],
    ['13-kubwa-jam', -470, -235, -Math.PI / 2, 7.5],
  ];
  for (const [name, x, z, yaw, hour] of tour) {
    await G(page, ([x, z, yaw, hour]) => { const g = window.__abuja; g.player.teleport(x, z, yaw); g.rig.snapBehind(yaw); g.rig.yaw = yaw; g.hour = hour; g.events.markFired('nepa', g.playTime); g.events.markFired('mummy', g.playTime); g.events.markFired('kubwa-jam', g.playTime); }, [x, z, yaw, hour]);
    await sleep(1800);
    await page.screenshot({ path: `${OUT}/${name}.png` });
  }
  const f = await fps(page);
  check('desktop: renders frames (software GL)', f > 1, `${f.toFixed(1)} fps in headless SwiftShader`);
  const stateInfo = await G(page, () => ({ tier: window.__abuja.tier, calls: window.__abuja.renderer.info.render.calls, tris: window.__abuja.renderer.info.render.triangles }));
  console.log('render info', stateInfo);
  // Pause via Tab
  check('desktop: Tab pauses', await pressUntil(page, 'Tab', () => page.isVisible('#pause'), 3));
  await page.click('#pause >> text=Settings');
  await sleep(300);
  await page.screenshot({ path: `${OUT}/14-settings.png` });
  // Remap jump to J
  await page.click('.bind-row:has-text("Jump") .keybtn');
  await page.keyboard.press('KeyJ');
  await sleep(200);
  const bindText = await page.textContent('.bind-row:has-text("Jump") .keybtn');
  check('desktop: key remap works', bindText?.includes('J') ?? false, bindText ?? '');
  const saved = await G(page, () => localStorage.getItem('abuja-life-save-v1'));
  check('desktop: progress saved to localStorage', !!saved && saved.includes('"agbada"'));
  check('desktop: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// ---------------- Mobile ----------------
{
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = await boot(page);
  check('mobile: touch mode detected', await G(page, () => window.__abuja.input.device === 'touch'));
  await page.tap('text=New Life');
  await sleep(500);
  await page.screenshot({ path: `${OUT}/20-mobile-customizer.png` });
  await page.tap('text=Start Life in Abuja');
  await sleep(600);
  await page.screenshot({ path: `${OUT}/20b-mobile-travel.png` });
  await page.tap('.tcard:has-text("Abuja City Gate")');
  await sleep(1400);
  check('mobile: touch controls visible', await page.isVisible('#touch'));
  check('mobile: keyboard hints hidden', !(await page.isVisible('.hints')));
  await page.screenshot({ path: `${OUT}/21-mobile-play.png` });
  const p0 = await pos(page);
  // Joystick drag on the left side (pointer events).
  await page.mouse.move(150, 300);
  await page.mouse.down();
  await page.mouse.move(150, 220, { steps: 5 });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/22-mobile-joystick.png` });
  await page.mouse.up();
  const p1 = await pos(page);
  check('mobile: joystick moves player', Math.hypot(p1.x - p0.x, p1.z - p0.z) > 2, `${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(1)} m`);
  // Look drag on the right.
  const yaw0 = await G(page, () => window.__abuja.rig.yaw);
  await page.mouse.move(500, 150);
  await page.mouse.down();
  await page.mouse.move(600, 150, { steps: 5 });
  await page.mouse.up();
  const yaw1 = await G(page, () => window.__abuja.rig.yaw);
  check('mobile: drag-to-look rotates camera', Math.abs(yaw1 - yaw0) > 0.05, `Δyaw=${(yaw1 - yaw0).toFixed(2)}`);
  // Talk button near NPC.
  await G(page, () => window.__abuja.player.teleport(-697, -233.6, Math.PI));
  await sleep(300);
  check('mobile: Talk button appears near NPC', await page.isVisible('.tbtn.action'));
  await page.tap('.tbtn.action');
  await sleep(600);
  check('mobile: tapping Talk opens dialogue', await page.isVisible('#dialogue'));
  await page.screenshot({ path: `${OUT}/23-mobile-dialogue.png` });
  for (let i = 0; i < 4 && !(await page.isVisible('.d-choice')); i++) { await page.tap('.d-text'); await sleep(400); }
  await page.tap('.d-choice >> nth=0');
  await sleep(400);
  for (let i = 0; i < 5 && (await page.isVisible('#dialogue')); i++) { await page.tap('.d-next'); await sleep(450); }
  check('mobile: dialogue closes and touch controls return', !(await page.isVisible('#dialogue')) && (await page.isVisible('#touch')));
  // Car button
  await G(page, () => window.__abuja.player.teleport(-713, -234, Math.PI / 2));
  await sleep(200);
  await page.tap('.tbtn.car');
  await sleep(400);
  check('mobile: Car button enters car', (await pos(page)).inCar);
  await page.screenshot({ path: `${OUT}/24-mobile-car.png` });
  const f = await fps(page);
  check('mobile: renders frames', f > 1, `${f.toFixed(1)} fps`);
  check('mobile: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// Portrait phone shows rotate hint.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await boot(page);
  check('portrait: rotate-phone hint shown', await page.isVisible('#rotate'));
  await page.screenshot({ path: `${OUT}/30-portrait.png` });
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
