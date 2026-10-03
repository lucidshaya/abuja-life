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
| Pause | Esc / P / Tab | Start | II button |
| Dialogue choices | 1 / 2 / 3 | D-pad | Tap |

All keyboard keys can be remapped in **Settings**. Settings and progress save automatically in the browser.

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
