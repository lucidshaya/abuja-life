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
  check('desktop: role picker opens first', await page.isVisible('#rolepicker'));
  check('roles: 10 roles to pick from', (await page.locator('.rp-card').count()) === 10, String(await page.locator('.rp-card').count()));
  await page.click('.rp-card[data-role="minister"]');
  await sleep(200);
  await page.screenshot({ path: `${OUT}/01b-roles.png` });
  await page.click('.rp-card[data-role="student"]');
  await page.click('.rp-go');
  await sleep(500);
  check('desktop: customizer opens', await page.isVisible('#customizer'));
  await page.click('.cz-tab[data-tab="style"]');
  await page.click('.chip:has-text("Agbada")');
  await sleep(400);
  await page.screenshot({ path: `${OUT}/02-customizer.png` });
  await page.click('text=Start Life in Abuja');
  await sleep(600);
  check('tutorial: shows the first time', await page.isVisible('#tutorial .tu-card'));
  await page.screenshot({ path: `${OUT}/02a-tutorial.png` });
  for (let i = 0; i < 5; i++) { await page.click('.tu-next'); await sleep(250); }
  check('tutorial: closes after 5 pages', !(await page.isVisible('#tutorial')));
  await sleep(1500);
  const home = await G(page, () => ({ indoor: window.__abuja.indoor?.id, state: window.__abuja.state }));
  check('spawn: new life starts inside your house', home.indoor === 'home', JSON.stringify(home));
  await page.waitForSelector('#explore .ex-card', { timeout: 8000 }).catch(() => {});
  check('explore: one-time "explore the map" card', await page.isVisible('#explore .ex-card'));
  await page.screenshot({ path: `${OUT}/02c-explore.png` });
  await page.click('#explore >> text=I go waka first');
  await sleep(400);
  check('onboarding: remembered for next time', await G(page, () => localStorage.getItem('abuja-life-onboarded-v1') === 'tutorial,explore'));
  await G(page, () => window.__abuja.openTravel('pause'));
  await sleep(600);
  check('desktop: travel menu opens', await page.isVisible('#travel'));
  const ncards = await page.locator('.tcard').count();
  check('desktop: travel menu lists places + start + workplace', ncards >= 10, String(ncards));
  check('travel: workplace pin for your role', await page.isVisible('.tcard:has-text("Your workplace")'));
  check('travel: your house pin', await page.isVisible('.tcard:has-text("Your house")'));
  await sleep(1500);
  const pinsVisible = await page.locator('.tv-pin').evaluateAll((els) => els.filter((e) => e.style.visibility !== 'hidden').length);
  check('travel: bird\'s-eye map shows place pins', pinsVisible >= 8, `${pinsVisible} pins on screen`);
  await page.hover('.tv-pin:has-text("Millennium Park")');
  await sleep(300);
  const cardText = await page.textContent('.tv-card');
  check('travel: hovering a pin shows the place', !!cardText && cardText.includes('Millennium Park'), (cardText ?? '').slice(0, 40));
  await page.screenshot({ path: `${OUT}/02b-travel.png` });
  await page.click('.tcard:has-text("Abuja City Gate")');
  await sleep(1400);
  let p0 = await pos(page);
  // Phone stays phone-sized even with long emails (wide desktop window).
  await page.setViewportSize({ width: 1000, height: 570 });
  await G(page, () => window.__abuja.openPhone('home'));
  await sleep(500);
  const phw = await G(page, () => document.querySelector('.ph-frame').getBoundingClientRect().width);
  await page.click('.ph-app:has-text("Mail")');
  await sleep(300);
  const phw2 = await G(page, () => document.querySelector('.ph-frame').getBoundingClientRect().width);
  check('phone: stays phone-sized with long emails', phw2 < 400 && phw2 >= 300, `${phw} → ${phw2}`);
  await page.screenshot({ path: `${OUT}/02d-phone-mail-wide.png` });
  await page.click('.ph-close');
  await page.setViewportSize({ width: 1280, height: 720 });
  await sleep(400);
  p0 = await pos(page);
  check('desktop: playing after customizer', p0.state === 'play', p0.state);
  const roleInfo = await G(page, () => ({ role: window.__abuja.save.role, money: window.__abuja.save.stats.money, mail: window.__abuja.save.phone.mail.length }));
  check('roles: student role saved with its money', roleInfo.role === 'student' && roleInfo.money === 15000 + 5000, JSON.stringify(roleInfo));
  check('roles: HUD shows the role', ((await page.textContent('.role-label')) ?? '').includes('Student'));
  check('hud: weekday instead of Day 1', ((await page.textContent('.clock')) ?? '').startsWith('Mon'), (await page.textContent('.clock')) ?? '');
  check('phone: button bounces for new players', await G(page, () => document.getElementById('phonebtn').classList.contains('nudge')));
  check('hud: balance labelled OPay account balance', ((await page.textContent('.bal-label')) ?? '').includes('OPay account balance'));
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
  await tp(-150.4, -93, -Math.PI / 2, 15);
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/15b-mall-outside.png` });
  await tp(-130, -100, -Math.PI * 0.62, 15);
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/15c-mall-carpark.png` });
  await tp(-200, -58, Math.PI * 0.08, 18);
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/15d-mall-boardwalk.png` });
  await tp(-150.4, -93, -Math.PI / 2);
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
  // Walk into the exit doors: should go outside automatically (no blue void).
  await tp(1470, 33, 0);
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 20 && (await pos(page)).x > 0; i++) await sleep(300);
  await page.keyboard.up('KeyW');
  await sleep(900);
  const outside = await pos(page);
  check('mall: walking into the exit door takes you outside', outside.x < 0, JSON.stringify(outside));
  await page.screenshot({ path: `${OUT}/15e-after-exit.png` });
  // Phone
  await pressUntil(page, 'KeyQ', () => page.isVisible('#phone'), 3);
  check('phone: Q opens the phone', await page.isVisible('#phone'));
  await page.screenshot({ path: `${OUT}/25-phone-home.png` });
  await page.click('.ph-app:has-text("OPay")');
  await sleep(300);
  const before = await G(page, () => window.__abuja.save.stats.money);
  check('phone: bank shows the balance', ((await page.textContent('.bk-bal')) ?? '').replace(/[^0-9]/g, '') === String(before));
  await page.click('.bk-act:has-text("To contacts")');
  await page.click('.ct-row:has-text("Mummy")');
  await page.click('.tf-amt:has-text("1,000")');
  await sleep(300);
  const after = await G(page, () => window.__abuja.save.stats.money);
  check('phone: transfer to Mummy deducts ₦1,010', before - after === 1010, `${before} → ${after}`);
  await page.screenshot({ path: `${OUT}/26-phone-bank.png` });
  await page.click('.bk-act:has-text("To any account")');
  await page.fill('.sa-form input >> nth=0', 'Musa Ibrahim');
  await page.fill('.sa-form input >> nth=1', '0123456789');
  await page.fill('.sa-form input >> nth=2', '2000');
  await page.click('.sa-form .ph-btn');
  await sleep(300);
  const after2 = await G(page, () => window.__abuja.save.stats.money);
  check('phone: send to any account deducts amount + fee', after - after2 === 2010, `${after} → ${after2}`);
  await page.click('.bk-act:has-text("Request money")');
  await page.click('.ct-row:has-text("Mummy")');
  await page.click('.tf-amt >> nth=0');
  await sleep(200);
  check('phone: request money sends a request', ((await page.textContent('.ph-toast')) ?? '').includes('sent'));
  await page.click('.ph-back');
  await page.click('.ph-back');
  await page.click('.ph-app:has-text("Mail")');
  await sleep(300);
  const mailText = (await page.textContent('.ph-body')) ?? '';
  check('mail: inbox shows your address and role welcome email', mailText.includes('@') && mailText.includes('Course registration'), mailText.slice(0, 90));
  await page.click('.ml-row >> nth=0');
  await sleep(200);
  await page.screenshot({ path: `${OUT}/26b-phone-mail.png` });
  await page.click('.ph-back');
  await page.click('.ph-back');
  await page.click('.ph-app:has-text("Messages")');
  await sleep(2300);
  const threads = await page.locator('.ms-row').count();
  check('phone: messages app lists conversations', threads >= 1, `${threads} threads`);
  await page.screenshot({ path: `${OUT}/27-phone-messages.png` });
  await page.click('.ph-back');
  await page.click('.ph-app:has-text("Contacts")');
  check('phone: contacts include Danladi taxi', await page.isVisible('.ct-row:has-text("Danladi")'));
  await page.click('.ph-close');
  await sleep(300);
  check('phone: closes back to the game', !(await page.isVisible('#phone')) && (await pos(page)).state === 'play');
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
  // ---- Quick actions: Nile "Go to class" ----
  // No random events from here on, so dialogs don't pop up mid-test.
  await G(page, () => { const g = window.__abuja; g.events.randomTick = () => null; g.events.zoneCheck = () => null; });
  const freeMouse = () => pressUntil(page, 'KeyT', () => G(page, () => !document.pointerLockElement), 4);
  const clearDialogue = async () => { for (let i = 0; i < 8 && (await page.isVisible('#dialogue')); i++) { await page.keyboard.press(i % 2 ? 'KeyE' : 'Escape'); await sleep(350); } };
  await clearDialogue();
  await tp(-470, 60, -Math.PI / 2, 10);
  await sleep(900);
  await clearDialogue();
  check('quick: side panel shows at Nile', await page.isVisible('#quick .qa-item:has-text("Go to class")'));
  await page.screenshot({ path: `${OUT}/31-quick-nile.png` });
  await freeMouse();
  await page.click('#quick .qa-item:has-text("Go to class")');
  for (let i = 0; i < 12 && !(await page.isVisible('#dialogue')); i++) await sleep(300);
  const cls = await G(page, () => ({ indoor: window.__abuja.indoor?.id, state: window.__abuja.state, speaker: document.querySelector('.d-speaker')?.textContent }));
  check('quick: "Go to class" lands in LT1 with the lecture', cls.indoor === 'lt1' && cls.state === 'dialogue' && (cls.speaker ?? '').includes('Okafor'), JSON.stringify(cls));
  await page.screenshot({ path: `${OUT}/32-quick-class.png` });
  const roleChoice = await page.isVisible('.d-choice:has-text("you read last night")').catch(() => false);
  for (let i = 0; i < 4 && !(await page.isVisible('.d-choice')); i++) { await page.keyboard.press('KeyE'); await sleep(400); }
  check('roles: student-only choice in the lecture', await page.isVisible('.d-choice:has-text("you read last night")') || roleChoice);
  await page.keyboard.press('Digit1');
  await sleep(500);
  await pressUntil(page, 'KeyE', async () => !(await page.isVisible('#dialogue')), 8);
  // Quick-item spots must not be inside walls.
  const blocked = await G(page, () => {
    const g = window.__abuja;
    const bad = [];
    for (const z of g.quickZones) for (const it of z.items) {
      const q = { x: it.x, z: it.z };
      g.world.resolveCircle(q, 0.35, 0, false);
      if (Math.hypot(q.x - it.x, q.z - it.z) > 0.3) bad.push(`${z.id}:${it.label}`);
    }
    return bad;
  });
  check('quick: every quick spot is walkable', blocked.length === 0, blocked.join(', '));
  // Work at your workplace (student → Nile gate).
  await tp(-402, 58, -Math.PI / 2, 9);
  await sleep(800);
  check('work: "Go to work" shows near your workplace', await page.isVisible('#quick .qa-item.accent'));
  const h0 = await G(page, () => window.__abuja.hour);
  await freeMouse();
  await page.click('#quick .qa-item.accent');
  await sleep(500);
  await pressUntil(page, 'KeyE', () => page.isVisible('.d-choice'), 6);
  await page.keyboard.press('Digit1');
  await sleep(500);
  const h1 = await G(page, () => window.__abuja.hour);
  check('work: working skips time', h1 - h0 >= 2.5, `${h0.toFixed(1)} → ${h1.toFixed(1)}`);
  await pressUntil(page, 'KeyE', async () => !(await page.isVisible('#dialogue')), 6);
  // Salary at 8am.
  const sal = await G(page, async () => { const g = window.__abuja; const m = g.save.stats.money; g.day += 1; g.hour = 8.2; await new Promise((r) => setTimeout(r, 900)); return g.save.stats.money - m; });
  check('salary: daily allowance lands at 8am', sal >= 3000, `+${sal}`);
  // Give cash (G) to Uncle Emeka.
  await tp(-697, -233.6, Math.PI, 10);
  await sleep(400);
  const mg0 = await G(page, () => window.__abuja.save.stats.money);
  await pressUntil(page, 'KeyG', () => page.isVisible('#dialogue'), 3);
  await pressUntil(page, 'KeyE', () => page.isVisible('.d-choice'), 6);
  await page.screenshot({ path: `${OUT}/33-give-cash.png` });
  await page.keyboard.press('Digit2');
  await sleep(500);
  const mg1 = await G(page, () => window.__abuja.save.stats.money);
  check('give: G gives ₦1,000 cash', mg0 - mg1 === 1000, `${mg0} → ${mg1}`);
  await pressUntil(page, 'KeyE', async () => !(await page.isVisible('#dialogue')), 6);
  // Dance emote.
  await tp(-690, -240, Math.PI / 2, 10);
  await pressUntil(page, 'KeyB', () => page.isVisible('#emotes'), 3);
  check('dance: B opens the emote menu', await page.isVisible('#emotes'));
  await page.screenshot({ path: `${OUT}/34-emote-menu.png` });
  await page.keyboard.press('Digit1');
  await sleep(1200);
  const pose = await G(page, () => window.__abuja.playerChar.pose);
  check('dance: picking an emote makes you dance', pose === 'egwu', pose);
  await G(page, () => { const g = window.__abuja; g.rig.yaw = g.player.heading + Math.PI; });
  await sleep(600);
  await page.screenshot({ path: `${OUT}/35-dancing.png` });
  await page.keyboard.down('KeyW');
  await sleep(1200);
  await page.keyboard.up('KeyW');
  check('dance: moving stops the dance', await G(page, () => window.__abuja.playerChar.pose === 'normal'));
  // M map: click a place to teleport.
  await pressUntil(page, 'KeyM', () => page.isVisible('#map'), 3);
  await sleep(400);
  const target = await G(page, () => {
    const g = window.__abuja;
    const p = g.fullMap.places.find((x) => x.name === 'Millennium Park');
    const [sx, sy] = g.fullMap.toScreen(p.x, p.z);
    const r = g.fullMap.canvas.getBoundingClientRect();
    return { x: r.left + sx, y: r.top + sy };
  });
  await page.mouse.move(target.x, target.y);
  await sleep(300);
  await page.screenshot({ path: `${OUT}/36-map-hover.png` });
  await page.mouse.click(target.x, target.y);
  await sleep(1500);
  const mp = await pos(page);
  check('map: clicking a place teleports there', Math.hypot(mp.x - 250, mp.z + 142) < 4 && mp.state === 'play', JSON.stringify(mp));
  // ---- Estate: your house, meter, service charge ----
  await G(page, () => window.__abuja.teleport(-204.5, -287, -Math.PI / 2));
  await sleep(1200);
  check('estate: quick panel lists your house', await page.isVisible('#quick .qa-item:has-text("Prepaid meter")'));
  await page.screenshot({ path: `${OUT}/37-estate-home.png` });
  await G(page, () => { const g = window.__abuja; g.hour = 21; g.save.home.units = 0; g.save.home.lastAbs = g.day * 24 + g.hour; });
  await sleep(1500);
  check('estate: light goes out with 0 units', await G(page, () => window.__abuja.blackout > 0));
  await page.screenshot({ path: `${OUT}/38-estate-no-light.png` });
  check('notify: banner pops up for a new text', await G(page, async () => { window.__abuja.addMsg('Test', 'hello'); await new Promise((r) => setTimeout(r, 300)); return !document.querySelector('.push').classList.contains('hidden'); }));
  await G(page, () => window.__abuja.teleport(-205.2, -290.5, -Math.PI / 2));
  await sleep(500);
  const mb = await G(page, () => window.__abuja.save.stats.money);
  await pressUntil(page, 'KeyE', () => page.isVisible('#dialogue'), 3);
  await pressUntil(page, 'KeyE', () => page.isVisible('.d-choice'), 6);
  await page.keyboard.press('Digit2');
  await sleep(600);
  const meterAfter = await G(page, () => ({ units: window.__abuja.save.home.units, money: window.__abuja.save.stats.money }));
  check('estate: buying a ₦5,000 token loads 25 units', meterAfter.units >= 24.9 && mb - meterAfter.money === 5000, JSON.stringify(meterAfter));
  await pressUntil(page, 'KeyE', async () => !(await page.isVisible('#dialogue')), 8);
  // ---- House interior + furniture shop ----
  await G(page, () => { const g = window.__abuja; g.save.stats.money += 500000; g.teleport(-205.2, -287, -Math.PI / 2); });
  await sleep(600);
  await pressUntil(page, 'KeyE', () => page.isVisible('#dialogue'), 3);
  await pressUntil(page, 'KeyE', () => page.isVisible('.d-choice'), 6);
  await page.keyboard.press('Digit1');
  await sleep(400);
  await pressUntil(page, 'KeyE', async () => !(await page.isVisible('#dialogue')), 8);
  await sleep(1200);
  check('house: "Go inside" enters your house', await G(page, () => window.__abuja.indoor?.id === 'home'));
  await page.screenshot({ path: `${OUT}/40-house-empty.png` });
  await G(page, () => window.__abuja.teleport(1488, 257.4, 0));
  await sleep(500);
  await pressUntil(page, 'KeyE', () => page.isVisible('#shop'), 3);
  check('house: laptop opens the furniture shop', await page.isVisible('#shop'));
  await page.screenshot({ path: `${OUT}/41-furniture-shop.png` });
  await page.click('.sh-row:has-text("Persian rug") .btn');
  await page.click('.sh-row:has-text("couch") .btn');
  await sleep(300);
  check('house: bought furniture appears', await G(page, () => { const g = window.__abuja; return g.save.home.furniture.includes('rug') && g.save.home.furniture.includes('couch'); }));
  await page.click('#shop .sh-head .btn');
  await sleep(300);
  await G(page, () => { const g = window.__abuja; g.teleport(1478, 262, Math.PI * 1.15); g.rig.yaw = Math.PI * 1.15; });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/42-house-furnished.png` });
  // ---- Waza: buy from the plug at Banex, sell to people ----
  await G(page, () => { const g = window.__abuja; g.hour = 20; g.save.stats.money += 20000; g.teleport(-70, 91.8, Math.PI); });
  await sleep(800);
  await pressUntil(page, 'KeyE', () => page.isVisible('#dialogue'), 3);
  await pressUntil(page, 'KeyE', () => page.isVisible('.d-choice'), 6);
  await page.keyboard.press('Digit1');
  await sleep(500);
  check('waza: buy 5 from the plug', await G(page, () => window.__abuja.save.waza === 5));
  await pressUntil(page, 'KeyE', async () => !(await page.isVisible('#dialogue')), 8);
  await G(page, () => { const g = window.__abuja; g.giveCash({ name: 'Bros', person: null, spot: null, almajiri: false }); });
  await pressUntil(page, 'KeyE', () => page.isVisible('.d-choice:has-text("Sell waza")'), 6);
  check('waza: sell option when you have stock', await page.isVisible('.d-choice:has-text("Sell waza")'));
  await page.screenshot({ path: `${OUT}/39-waza.png` });
  await page.keyboard.press('Escape');
  await page.click('.d-choice:has-text("another time")').catch(() => {});
  await pressUntil(page, 'KeyE', async () => !(await page.isVisible('#dialogue')), 8);
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
  await page.screenshot({ path: `${OUT}/20a-mobile-roles.png` });
  await page.tap('.rp-card[data-role="almajiri"]');
  await page.tap('.rp-go');
  await sleep(500);
  await page.screenshot({ path: `${OUT}/20-mobile-customizer.png` });
  await page.tap('text=Start Life in Abuja');
  await sleep(600);
  await page.screenshot({ path: `${OUT}/20b-mobile-tutorial.png` });
  for (let i = 0; i < 5; i++) { await page.tap('.tu-next'); await sleep(250); }
  await page.waitForSelector('#explore .ex-card', { timeout: 8000 }).catch(() => {});
  await page.screenshot({ path: `${OUT}/20c-mobile-explore.png` });
  await page.tap('#explore >> text=Open the map');
  await sleep(600);
  check('mobile: explore card opens the map', await page.isVisible('#map'));
  await page.tap('.map-head >> text=Fast travel');
  await sleep(600);
  await page.tap('.tcard:has-text("Abuja City Gate")');
  await sleep(1400);
  check('mobile: touch controls visible', await page.isVisible('#touch'));
  check('mobile: keyboard hints hidden', !(await page.isVisible('.hints')));
  check('mobile: Dance button visible', await page.isVisible('.tbtn.dance'));
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
  await page.waitForSelector('#dialogue:not(.hidden)', { timeout: 8000 }).catch(() => {});
  check('mobile: tapping Talk opens dialogue', await page.isVisible('#dialogue'));
  await page.screenshot({ path: `${OUT}/23-mobile-dialogue.png` });
  for (let i = 0; i < 4 && !(await page.isVisible('.d-choice')); i++) { await page.tap('.d-text'); await sleep(400); }
  await page.tap('.d-choice >> nth=0');
  await sleep(400);
  for (let i = 0; i < 10 && (await page.isVisible('#dialogue')); i++) { await page.tap('.d-next').catch(() => {}); await sleep(600); }
  check('mobile: dialogue closes and touch controls return', !(await page.isVisible('#dialogue')) && (await page.isVisible('#touch')));
  // Car button
  await G(page, () => window.__abuja.player.teleport(-713, -234, Math.PI / 2));
  await page.waitForSelector('.tbtn.car:not(.hidden)', { timeout: 8000 }).catch(() => {});
  check('mobile: Car button only shows next to a car', await page.isVisible('.tbtn.car'));
  for (let i = 0; i < 4 && !(await pos(page)).inCar; i++) { await page.tap('.tbtn.car').catch(() => {}); await sleep(700); }
  check('mobile: Car button enters car', (await pos(page)).inCar);
  await page.screenshot({ path: `${OUT}/24-mobile-car.png` });
  await G(page, () => { const g = window.__abuja; g.leaveCar(true); g.teleport(-470, 60, -Math.PI / 2); g.hour = 11; });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/24b-mobile-nile.png` });
  await page.tap('#quick .qa-head');
  await sleep(500);
  await page.screenshot({ path: `${OUT}/24c-mobile-quick.png` });
  check('mobile: quick panel expands with a tap', await page.isVisible('#quick .qa-item'));
  const f = await fps(page);
  check('mobile: renders frames', f > 1, `${f.toFixed(1)} fps`);
  check('mobile: no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// Sound is on by default, even if a previous session muted it.
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('abuja-life-save-v1', JSON.stringify({ version: 1, settings: { muted: true }, pos: { x: -704, z: -236.6, heading: 1.57 } }));
    } catch {}
  });
  const page = await ctx.newPage();
  await boot(page);
  await sleep(1500);
  check('sound: starts unmuted even after a muted session', await G(page, () => window.__abuja.save.settings.muted === false && !document.getElementById('mute').classList.contains('muted')));
  const pre = await G(page, () => ({ running: window.__abuja.audio.running, playing: window.__abuja.audio.music.playing }));
  const hintShown = await page.isVisible('#soundhint');
  check('sound: hint shows only while audio is blocked', hintShown === !(pre.running && pre.playing), `autoplay=${pre.running && pre.playing}, hint=${hintShown}`);
  await page.mouse.click(500, 600);
  await sleep(2500);
  const music = await G(page, () => ({ running: window.__abuja.audio.running, playing: window.__abuja.audio.music.playing, src: window.__abuja.audio.music.file?.city?.src ?? null }));
  check('sound: first click starts the soundtrack', music.running && music.playing, JSON.stringify(music));
  check('sound: hint hides once music plays', !(await page.isVisible('#soundhint')));
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
