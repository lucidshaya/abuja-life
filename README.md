# Abuja Life 🇳🇬

A 3D open-world browser game with real Abuja vibes. Explore a stylized FCT, from Zuma Rock and the Kubwa
expressway hold-up to Wuse 2 suya spots, Maitama mansions, Jabi Lake, Wuse Market, Area 1 roundabout,
Eagle Square, the National Mosque and Aso Rock. Customize your character, drive, and get into Naija
wahala and enjoyment.

Plays in any modern browser on **PC (keyboard + mouse)**, **gamepad**, and **phones (touch)**.

## Play locally

```bash

npm install
npm run dev        # http://localhost:5173
```

Production build: `npm run build`, then `npm run preview`. The `dist/` folder is a static site, so you
can host it anywhere (GitHub Pages, Netlify, Vercel, any web server). Paths are relative, so it also
works from a sub-folder.

## Controls

| | PC | Gamepad | Phone |
|---|---|---|---|
| Move / steer | WASD or arrows | Left stick | Drag on left side (push far to run) |
| Look | Mouse (click to lock) | Right stick | Drag on right side |
| Run / nitro | Shift | B | Run button |
| Jump / handbrake | Space | A | Jump / Brake button |
| Talk | E | X | Talk button (appears near people) |
| Enter / exit car | F | Y | Car button |
| Horn | H | RB | Horn button |
| Map | M | View | Map button |
| Phone | Q | — | Phone button |
| Pause | Esc / P / Tab | Start | II button |
| Dialogue choices | 1 / 2 / 3 | D-pad | Tap |

All keyboard keys can be remapped in **Settings**. Settings and progress save automatically in the browser.

## Fast travel: 8 places

After **New Life** or **Continue**, a bird's-eye view of the whole city appears. Hover over a pin to see what's there and
click to go (on phones, tap a pin, then **Go there**). It also opens from **Pause → Fast Travel**, **Map → Fast travel**,
the phone's **Maps** app, and Danladi's taxi:

- **Jabi Lake Mall** *(featured)*. Outside: the two-storey lakeside mall with its triple-height "tree" atrium entrance, a
  full car park (bays, parked cars, lamps, security barrier), the ShopRight anchor entrance and a lakeside boardwalk with
  restaurant terraces. Inside: a full interior with a fountain atrium, walk-in shops (fashion, phones, cinema, books,
  pharmacy), a food court, a kids zone, and the ShopRight supermarket with aisles, fridges, fresh produce, water pallets
  and checkouts.
- **Nile University** *(featured)*. Gate security, the senate building, faculties, the library, Mama Caf, a football
  match at the Faculty Cup, basketball, hostels, a chapel and a mosque, and a walk-in Lecture Theatre 1.
- **Millennium Park** *(featured)*. A water channel with cascades and bridges, a central fountain, a pond, a jogging
  loop, gazebos, a playground, picnics, a pre-wedding shoot, an ice-cream cart and horse rides.
- **The Cage** (nightclub in Wuse 2). Opens at 9pm, with a bouncer, LED dance floor, DJ, bar and VIP section.
- **Wuse 2**, **Maitama**, **Guzape Hills**, **Wuse Market**.

New games start at the **Abuja City Gate** on the expressway. Traffic is a mix of Corollas, Mercedes-Benz sedans,
Changan UNI SUVs and green-and-white Corolla cabs.

## Your phone (Q)

- **OkPay**: your wallet. Balance (with a hide button), full transaction history, transfers to your contacts (₦10 fee),
  airtime, data, cable TV and electricity tokens (buying one ends a NEPA blackout).
- **Messages**: texts from Mummy every morning, the Wuse Boys & Girls group chat, credit alerts, and people you meet.
- **Contacts**: call people. You unlock more numbers by meeting them around Abuja. Call **Danladi** for a ₦2,500 taxi
  anywhere.
- **Music**, **Maps** (city map + fast travel) and **Settings** (sound, graphics, wallpaper).

## Music

Sound is **on by default** every time the game starts (mute with the speaker button or **N** lasts only for that
session). Browsers only allow audio after your first tap, click or key press, so the music kicks in then. A
"Tap anywhere for sound" hint shows on the menu until it does.

The soundtrack is **"How Far" (feat. Ayjay Bobo)**, shipped at `public/music/theme.mp3` and played everywhere,
including inside the club (add `public/music/club.mp3` to give the club its own track). If the file is
missing, the game falls back to an original synthesized Afrobeats/amapiano groove. Use the
speaker button (or **N**) to mute/unmute. To play your own song: **Settings → Your music → Choose song…**. It's
stored on your device only. To ship a track with the game (only if you have the rights), put it at
`public/music/theme.mp3` (and optionally `public/music/club.mp3`).

## What's in v1

- **Map:** 11 areas: Abuja–Kaduna Expressway (Zuma Rock, City Gate), Kubwa, Gwarinpa Estate, Maitama,
  Three Arms Zone (Aso Rock), Jabi Lake, Wuse 2, Central Area (National Mosque, National Christian Centre,
  Eagle Square), Utako & Wuse Market, Garki & Area 1, and Asokoro.
- **Character creator:** skin tone, build, height, hair (low cut, afro, dreads, braids, gele, hijab),
  facial hair, outfits (kaftan, agbada, senator, suit, ankara, Super Eagles jersey, aso-ebi),
  fabric colours and ankara patterns, fila / kufi / face cap, shades, and where you're from (changes
  dialogue and starting money).
- **17 events** in Pidgin with English-friendly choices: VIO checkpoint, Kubwa jam, suya, Wuse Market
  haggling, owambe (aso-ebi check!), "come back tomorrow" ministry, "Do you know who I am?", Area 1
  crusade, One-Way taxi, Jabi boat ride, POS stand, Aso Rock checkpoint, NEPA blackout, Mummy's phone
  call, fuel scarcity, and your gateman (change clothes / sleep).
- **Driving:** arcade handling with handbrake drifts, nitro, a horn, and traffic that keeps right,
  including green-and-white Abuja cabs.
- **Living city:** day/night cycle (one in-game day = 24 minutes), lit windows and street lamps at night,
  pedestrians, and blackouts that actually turn the lights off.
- **Performance:** procedural low-poly art with no downloads (about 190 KB gzipped). Instanced rendering,
  auto quality (Low/Medium/High), and fog-limited draw distance tuned for mid-range phones.

## Project layout

```
src/
  core/     Game loop & states, unified input, save, quality tiers, collision, audio
  world/    Map data, procedural city, landmarks, day/night, traffic, NPCs
  player/   Character model, customization options, controller, vehicle, camera
  events/   Event system + events data (add new events in eventsData.ts)
  ui/       HUD, minimap/full map, dialogue, menus/settings, customizer, touch controls
tests/      Unit tests (vitest)
scripts/    e2e.mjs: Playwright smoke test (desktop keyboard + mobile touch)
```

### Adding an event

Add an entry to `src/events/eventsData.ts`. Use a `trigger` of type `npc` (and add an `NpcSpot` in
`src/world/MapData.ts`), `zone` (a district, an hour range, in car), or `random`. Choices can require
money, clout, an outfit, a background, or a flag. Outcomes can change money and clout, skip time,
teleport, set flags, cause a blackout, or open the wardrobe. `npm test` checks that the data is valid.

## Tests

```bash
npm run typecheck
npm test                                  # unit tests
npm run build && npx vite preview --port 4173 &
npm run e2e                               # browser smoke test (needs Chromium; set CHROME=/path/to/chrome)
```

## Deploying

`.github/workflows/pages.yml` deploys to GitHub Pages. Enable Pages
(Settings → Pages → Source: GitHub Actions), then run the workflow from the Actions tab.

Landmarks are stylized tributes. The ministry, mall and characters in the game are fictional.
