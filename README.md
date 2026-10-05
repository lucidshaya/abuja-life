# Abuja Life 🇳🇬

**Play now:** https://abuja-life-phi.vercel.app

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
| Map (click to teleport) | M | View | Map button |
| Phone | Q | — | Phone button |
| Quick actions (places inside a location) | 1–9 (T frees the mouse to click) | — | "Places in…" panel |
| Dance emotes | B, then 1–5 | — | Dance button |
| Give cash / ask for sadaka | G | — | Give button (appears near people) |
| Pause | Esc / P / Tab | Start | II button |
| Dialogue choices | 1 / 2 / 3 / 4 | D-pad | Tap |

All keyboard keys can be remapped in **Settings**. Settings and progress save automatically in the browser.

## Fast travel: 8 places

After **New Life** or **Continue**, a bird's-eye view of the whole city appears. Hover over a pin to see what's there and
click to go (on phones, tap a pin, then **Go there**). It also opens from **Pause → Fast Travel**, **Map → Fast travel**,
the phone's **Maps** app, and Danladi's taxi:

- **Jabi Lake Mall** *(featured)*. Outside: the two-storey lakeside mall with its triple-height "tree" atrium entrance, a
  full car park (bays, parked cars, lamps, security barrier), the ShopRite anchor entrance and a lakeside boardwalk with
  restaurant terraces. Inside: a full interior with a fountain atrium, walk-in shops (fashion, phones, cinema, books,
  pharmacy), a food court, a kids zone, and the ShopRite supermarket with aisles, fridges, fresh produce, water pallets
  and checkouts.
- **Nile University** *(featured)*. Gate security, the senate building, faculties, the library, Mama Caf, a football
  match at the Faculty Cup, basketball, hostels, a chapel and a mosque, and a walk-in Lecture Theatre 1.
- **Millennium Park** *(featured)*. A water channel with cascades and bridges, a central fountain, a pond, a jogging
  loop, gazebos, a playground, picnics, a pre-wedding shoot, an ice-cream cart and horse rides.
- **The Cage** (nightclub in Wuse 2). Opens at 9pm, with a bouncer, LED dance floor, DJ, bar and VIP section.
- **Wuse 2**, **Maitama**, **Guzape Hills**, **Wuse Market**.

New games start at the **Abuja City Gate** on the expressway. Traffic is a mix of Corollas, Mercedes-Benz sedans,
Changan UNI SUVs and green-and-white Corolla cabs.

## Roles: who you be for Abuja?

**New Life** starts with a Lagos-Life-style role pick, then the character creator (already dressed for the role), then
the bird's-eye map:

| Role | Start (OPay) | Pay | Works at |
|---|---|---|---|
| Almajiri | ₦300 | Beg for sadaka (G near people, or work at the market) | Wuse Market |
| Student | ₦15,000 | ₦3,000/day allowance | Nile University |
| NYSC Corper | ₦20,000 | ₦2,600/day "allawee" | Kubwa |
| POS Agent | ₦50,000 | Run your stand | Garki |
| Taxi Driver | ₦8,000 | One-way runs | Jabi Motor Park |
| Market Trader | ₦40,000 | Sell at your shop | Wuse Market |
| Civil Servant | ₦30,000 | ₦5,000/day | Federal Ministry |
| Tech Bro | ₦250,000 | ₦15,000/day | Wuse 2 |
| Politician (Senator) | ₦2,500,000 | ₦150,000/day | National Assembly |
| FCT Minister | ₦10,000,000 | ₦300,000/day | Central Area |

Salaries land in your OPay account at 8am with a credit alert and a payslip email. Near your workplace the quick panel
shows a **work** action (time passes, money and clout come in; rest 8 hours between shifts). Some events have
role-only choices (the Minister inspecting the ministry, a Senator at the VIO checkpoint, "Corper wee!", a student
answering in class, an almajiri asking Mallam Musa for sadaka…). Your background still adds a bonus on top.

## Quick actions

Walk into a big place and a **Places in …** panel lists what's inside: e.g. at Nile University: **Go to class (LT1)**,
Library, Mama Caf, Faculty football, SUG board, Senate, Hostels, Main gate. Pick one (or press 1–9) to go straight
there; if someone is there, the conversation starts. Every big location has one (Jabi Lake Mall inside and out,
Millennium Park, The Cage, Guzape and the new places).

## Money

- **Give cash (G):** to anyone near you: street walkers, crowds, or people you can talk to (₦200 / ₦1,000 / ₦5,000).
  Almajiri boys on the streets ask for sadaka. As an almajiri, G asks people for sadaka instead.
- **OPay:** send to your contacts, **send to any account** (name, 10-digit number, bank, amount), **request money** from
  contacts (they text back, sometimes with a credit alert), airtime and bills.
- The HUD shows your **OPay account balance**.

## Dance (B)

Five Naija TikTok moves: **Egwu Abuja**, **Step Pass**, **Shaku Shaku**, **Zanku (Legwork)** and **Buga**. Moving stops
the dance; people nearby sometimes hail you (+clout).

## Your phone (Q)

- **OPay**: your wallet. Balance (with a hide button), full transaction history, transfers to contacts or any bank
  account (₦10 fee), money requests, airtime, data, cable TV and electricity tokens (buying one ends a NEPA blackout).
- **Mail**: your own address (e.g. `chidi@fcta.gov.abujalife.ng` for the Minister), the role welcome email, payslips
  and memos.
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
- **Character creator:** detailed faces (face shape, eye colour, eyebrows, lip colour, tribal marks: Pele, Abaja,
  Zubaya), skin tone, build, height, hair (low cut, skin fade, afro, twists, dreads, braids, gele, hijab), facial hair,
  13 outfits (kaftan, agbada, babariga, senator, isiagu, suit, ankara, Super Eagles jersey, aso-ebi, iro & buba, abaya,
  NYSC khaki, jalabiya), fabric colours and patterns, trousers, shoes, caps (fila, kufi, zanna, red chief cap, face cap,
  NYSC cap), shades, specs, watch, chain, bag, and where you're from (changes dialogue and starting money). Arms and legs
  bend at the elbows and knees.
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

## Accounts & online play

Players sign up with an **email + username** (no verification). The same email logs back into the same account on
any device, and the whole game save (money, role, house, furniture, phone) is attached to it. Players can find each
other by **@username** in the phone's **Chats** app, chat, and send OPay money (**OPay → To a player**). The menu and
HUD show how many players are online.

Without a server configured, accounts stay on the device and multiplayer is off. To turn on online play:

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: paste `supabase/schema.sql` and **Run**.
3. **Authentication → Sign In / Providers → Email**: turn **off** "Confirm email".
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
5. Vercel project → **Settings → Environment Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   (all environments), then redeploy. (For local dev, put them in `.env.local`, see `.env.example`.)

Because there's no email verification, anyone who knows a player's email can log into that account.

## Deploying (Vercel)

1. [vercel.com/new](https://vercel.com/new) → **Import** the `lucidshaya/abuja-life` GitHub repo. Settings come from
   `vercel.json` (Vite, `npm test && npm run build`, output `dist`), so just press **Deploy**.
2. Add the two Supabase environment variables (see above) and redeploy.
3. Every push to the production branch (`main` by default) redeploys; other branches get preview links.

`.github/workflows/pages.yml` can also deploy to GitHub Pages manually as a backup.

Landmarks are stylized tributes. The ministry, mall and characters in the game are fictional.
