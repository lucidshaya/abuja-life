import * as THREE from 'three';
import { Audio } from './Audio';
import { CollisionWorld, type Dynamic } from './Collision';
import { Input, mergeBindings } from './Input';
import { FpsSampler, TIERS, guessTier, isTouchDevice, lowerTier, type Tier } from './Quality';
import { loadSave, newSave, writeSave, type SaveData, type Settings } from './Save';
import { clamp } from './rng';
import { EventSystem, applyEffects, linesFor, meets, type EventContext, type GameEvent, type Outcome } from '../events/EventSystem';
import { EVENTS } from '../events/eventsData';
import { withRoleChoices } from '../events/roleChoices';
import { CameraRig } from '../player/CameraRig';
import { Character, EMOTES } from '../player/Character';
import { STARTING_STATS, upgradeCharacter, type CharacterConfig } from '../player/CharacterConfig';
import { playerEmail, roleById, type Role } from '../player/Roles';
import { RolePicker } from '../ui/RolePicker';
import { PlayerController } from '../player/PlayerController';
import { Vehicle } from '../player/Vehicle';
import { buildCity } from '../world/CityBuilder';
import { DayNight } from '../world/DayNight';
import { buildLandmarks } from '../world/Landmarks';
import { CAR_SPOTS, LANDMARKS, NPC_SPOTS, SPAWN, WORLD, districtAt, type NpcSpot } from '../world/MapData';
import { updateGlowMaterials, worldUniforms } from '../world/Materials';
import { Npcs } from '../world/Npc';
import { Traffic } from '../world/Traffic';
import { Crowds } from '../world/Crowd';
import { PORTALS, TRAVEL, interiorAt, type Interior, type Portal, type TravelSpot } from '../world/locations/Locations';
import { QUICK_ZONES, quickZoneAt, type QuickItem, type QuickZone } from '../world/locations/QuickPlaces';
import { QuickActions, type QuickEntry } from '../ui/QuickActions';
import { EmoteMenu } from '../ui/EmoteMenu';
import type { Person } from '../world/Npc';
import { buildMall } from '../world/locations/Mall';
import { buildNile } from '../world/locations/Nile';
import { buildPark } from '../world/locations/Park';
import { buildCage, buildGuzape } from '../world/locations/Small';
import { ABUJA2_QUICK, buildAbuja2 } from '../world/locations/Abuja2';
import { TravelMenu, type TravelChoice, type TravelMode } from '../ui/TravelMenu';
import { Phone } from '../ui/Phone';
import { BILLS, FLAG_TEXTS, TAXI_FARE, TRANSFER_FEE, groupText, morningText, requestReply, transferOp, uid, type Contact } from '../phone/PhoneData';
import { clearTrack, loadTrack, saveTrack } from './TrackStore';
import { CAR_MODELS } from '../player/Vehicle';
import { Customizer } from '../ui/Customizer';
import { Dialogue } from '../ui/Dialogue';
import { Hud } from '../ui/Hud';
import { Menus } from '../ui/Menus';
import { FullMap, MapImage, Minimap, npcMarkers, type MapMarker } from '../ui/Minimap';
import { TouchControls } from '../ui/TouchControls';
import { $, h, naira, show } from '../ui/dom';

type State = 'loading' | 'menu' | 'customize' | 'play' | 'paused' | 'dialogue' | 'map' | 'travel' | 'phone';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.5, 900);
  readonly world = new CollisionWorld();
  readonly input: Input;
  readonly audio = new Audio();
  readonly events = new EventSystem(withRoleChoices(EVENTS));
  readonly touch: boolean;

  state: State = 'loading';
  save: SaveData;
  tier: Tier;
  hour = 9;
  day = 1;
  flags = new Set<string>();
  playTime = 0;

  private clock = new THREE.Clock();
  private rig: CameraRig;
  private dayNight!: DayNight;
  private traffic!: Traffic;
  private npcs!: Npcs;
  private glowMats: THREE.MeshLambertMaterial[] = [];
  private poolMat: THREE.MeshBasicMaterial | null = null;
  private animators: ((t: number, dt: number) => void)[] = [];
  private player!: PlayerController;
  private playerChar!: Character;
  private cars: Vehicle[] = [];
  private car: Vehicle | null = null;
  private hud!: Hud;
  private minimap!: Minimap;
  private fullMap!: FullMap;
  private dialogue!: Dialogue;
  private menus!: Menus;
  private customizer!: Customizer;
  private rolePicker!: RolePicker;
  private quick!: QuickActions;
  private quickActs: (() => void)[] = [];
  private quickZones: QuickZone[] = [...QUICK_ZONES, ...ABUJA2_QUICK];
  private emotes!: EmoteMenu;
  private cheerAt = -999;
  private giveTarget: { name: string; person: Person | null; spot: NpcSpot | null; almajiri: boolean } | null = null;
  private touchUi!: TouchControls;
  private district: string | null = null;
  private blackout = 0;
  private autosave = 0;
  private minimapTimer = 0;
  private sampler = new FpsSampler();
  private autoDowngrades = 0;
  private pendingAfterDialogue: (() => void) | null = null;
  private talkingTo: NpcSpot | null = null;
  private expectUnlock = false;
  private time = 0;
  private focus = new THREE.Vector3();
  private menuAngle = 0;
  private parkedDyn: Dynamic[] = [];
  private crowds!: Crowds;
  private travel!: TravelMenu;
  private indoor: Interior | null = null;
  private fading = false;
  private muteBtn!: HTMLButtonElement;
  private phone!: Phone;
  private phoneBtn!: HTMLButtonElement;
  private travelT = 0;
  private aerial = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.touch = isTouchDevice();
    this.save = loadSave() ?? newSave();
    this.tier = this.save.settings.quality === 'auto' ? guessTier(this.touch, navigator.hardwareConcurrency || 4) : this.save.settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.touch, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.fog = new THREE.Fog(0xcfe0ea, 60, TIERS[this.tier].fogFar);
    this.input = new Input(canvas, mergeBindings(this.save.settings.bindings));
    if (this.touch) this.input.device = 'touch';
    this.rig = new CameraRig(this.camera);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ------------------------------------------------------------------ boot
  async init(progress: (p: number, msg: string) => void): Promise<void> {
    progress(0.05, 'Clearing the road at Zuma Rock…');
    await nextFrame();
    const city = buildCity(this.world);
    this.scene.add(city.group);
    this.glowMats.push(...city.glowMats);
    this.poolMat = city.poolMat;
    // Interiors sit east of the city, so the bounds cover both; walls fence the city itself.
    this.world.bounds = { x0: WORLD.x0, z0: WORLD.z0, x1: 1700, z1: WORLD.z1 };
    this.world.addBox(WORLD.x1, WORLD.z0 - 5, WORLD.x1 + 5, WORLD.z1 + 5, 50);
    progress(0.45, 'Painting Aso Rock and the National Mosque…');
    await nextFrame();
    const lm = buildLandmarks(this.world);
    this.scene.add(lm.group);
    this.glowMats.push(...lm.glowMats);
    this.animators.push(...lm.animators);
    progress(0.55, 'Stocking ShopRite shelves and filling Millennium Park…');
    await nextFrame();
    const locs = [buildMall(this.world), buildNile(this.world), buildPark(this.world), buildCage(this.world), buildGuzape(this.world), buildAbuja2(this.world)];
    for (const l of locs) {
      this.scene.add(l.group);
      this.animators.push(...l.animators);
      this.glowMats.push(...l.glowMats);
    }
    this.crowds = new Crowds(locs.flatMap((l) => l.crowds), this.tier === 'low' ? 0.55 : this.tier === 'medium' ? 0.8 : 1);
    this.scene.add(this.crowds.root);
    progress(0.65, 'Calling One-Way drivers into position…');
    await nextFrame();
    this.dayNight = new DayNight(this.scene);
    this.traffic = new Traffic(TIERS.high.traffic);
    this.scene.add(...this.traffic.meshes);
    this.npcs = new Npcs(TIERS.high.walkers);
    this.scene.add(this.npcs.group);
    for (const s of NPC_SPOTS) if (s.look !== 'none') this.world.addCircle(s.x, s.z, 0.4, 2);
    for (const c of CAR_SPOTS) {
      const v = new Vehicle(c.x, c.z, c.heading, c.color, c.model);
      this.cars.push(v);
      this.scene.add(v.root);
    }
    progress(0.8, 'Waking up Mallam Musa’s suya grill…');
    await nextFrame();
    this.playerChar = new Character(this.save.character);
    this.scene.add(this.playerChar.root);
    this.player = new PlayerController(SPAWN.x, SPAWN.z, SPAWN.heading, this.playerChar);
    this.setupUi(city.buildings);
    this.applySettings(this.save.settings);
    // Try to start the soundtrack straight away (works where the browser allows autoplay).
    this.audio.unlock();
    this.audio.music.setMode('city');
    window.setInterval(() => this.syncSoundHint(), 1000);
    void loadTrack().then((t) => {
      if (t) {
        this.audio.music.setUserTrack(t.file, t.name);
        this.menus.setTrackName(t.name);
      }
    });
    progress(0.95, 'Ready. Welcome to Abuja!');
    // Warm up shaders so the first gameplay frame doesn't stutter.
    this.camera.position.set(0, 120, 300);
    this.camera.lookAt(0, 0, 0);
    this.dayNight.update(18, new THREE.Vector3(), this.camera);
    this.renderer.compile(this.scene, this.camera);
    await nextFrame();
    this.goMenu();
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.tick());
    (window as unknown as { __abuja: Game }).__abuja = this;
  }

  private setupUi(buildings: { x0: number; z0: number; x1: number; z1: number }[]): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const game = this;
    this.hud = new Hud();
    this.hud.bindings = this.input.bindings;
    this.hud.device = this.input.device;
    const img = new MapImage(buildings);
    this.minimap = new Minimap(this.hud.minimapCanvas, img);
    const mapEl = $('map');
    const mapCanvas = h('canvas.fullmap') as HTMLCanvasElement;
    mapEl.append(
      h('div.map-head', {}, h('span', { text: 'ABUJA — FCT' }), h('div.map-actions', {},
        h('button.btn.small.primary', { type: 'button', onclick: () => { show($('map'), false); this.openTravel('pause'); } }, 'Fast travel ▸'),
        h('button.btn.small', { type: 'button', onclick: () => this.closeMap() }, 'Close ✕'))),
      mapCanvas,
      h('div.map-legend', { html: '<b>Click a place or anywhere on the map to teleport.</b> &nbsp; <span class="dot y"></span> Talk to people &nbsp; <span class="dot b"></span> Cars &nbsp; <span class="dot h"></span> Your flat' }),
    );
    this.fullMap = new FullMap(mapCanvas, img);
    this.dialogue = new Dialogue();
    this.dialogue.onClick = () => this.audio.click();
    this.dialogue.keyLabel = (i) => (this.input.device === 'gamepad' ? ['↑', '←', '↓', '→'][i] : String(i + 1));
    this.customizer = new Customizer();
    this.customizer.onClick = () => this.audio.click();
    this.rolePicker = new RolePicker();
    this.rolePicker.onClick = () => this.audio.click();
    this.quick = new QuickActions(document.body);
    this.quick.onClick = () => this.audio.click();
    this.quick.onPick = (i) => this.quickActs[i]?.();
    this.emotes = new EmoteMenu(document.body);
    this.emotes.onClick = () => this.audio.click();
    this.emotes.onPick = (id) => this.startEmote(id);
    window.addEventListener('keydown', (e) => {
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (!m || this.state !== 'play') return;
      const i = Number(m[1]) - 1;
      if (this.emotes.open) this.emotes.pick(i);
      else this.quick.press(i);
    });
    this.fullMap.places = TRAVEL.map((t) => ({ name: t.name, color: t.color, x: t.pin?.x ?? t.x, z: t.pin?.z ?? t.z, to: { x: t.x, z: t.z, heading: t.heading } }));
    this.fullMap.places.unshift({ name: 'Abuja City Gate', color: '#0f7a45', x: LANDMARKS.cityGate.x, z: LANDMARKS.cityGate.z, to: SPAWN });
    this.fullMap.onTeleport = (place, x, z) => this.mapTeleport(place?.name ?? null, x, z, place?.to?.heading);
    this.touchUi = new TouchControls(this.input);
    this.menus = new Menus(this.input, {
      onContinue: () => this.continueGame(),
      onNewGame: () => this.newGame(),
      onResume: () => this.resume(),
      onQuit: () => {
        this.persist();
        this.goMenu();
      },
      onSettingsChanged: (s) => {
        this.applySettings(s);
        this.persist();
      },
      onClick: () => {
        this.audio.unlock();
        this.audio.click();
      },
      onTravel: () => this.openTravel('pause'),
      onPickTrack: (file) => {
        this.audio.unlock();
        this.audio.music.setUserTrack(file, file.name);
        this.menus.setTrackName(file.name);
        void saveTrack(file, file.name);
      },
      onClearTrack: () => {
        this.audio.music.setUserTrack(null, null);
        this.menus.setTrackName(null);
        void clearTrack();
      },
    });
    this.menus.setSettings(this.save.settings);
    this.travel = new TravelMenu();
    this.travel.onClick = () => this.audio.click();
    this.phone = new Phone({
      get state() { return game.save.phone; },
      money: () => this.save.stats.money,
      hour: () => this.hour,
      day: () => this.day,
      flags: () => this.flags,
      playerName: () => this.save.character.name,
      trackName: () => this.audio.music.userTrackName ?? (this.audio.music.hasThemeFile ? 'How Far (feat. Ayjay Bobo)' : 'Abuja Life Beats'),
      muted: () => this.save.settings.muted,
      musicVolume: () => this.save.settings.musicVolume,
      quality: () => this.save.settings.quality,
      transfer: (c, amount) => this.bankOp(transferOp(c, amount)),
      sendAny: (name, bank, amount) => this.bankOp({ label: `Transfer to ${name.toUpperCase()} (${bank})`, amount: -(amount + TRANSFER_FEE), clout: amount >= 50000 ? 1 : 0 }),
      request: (c, amount) => {
        const key = `req:${c.id}:${this.day}`;
        if (this.flags.has(key)) return `You don already ask ${c.name} today. No disturb them.`;
        this.flags.add(key);
        const r = requestReply(c, amount, Math.random);
        window.setTimeout(() => {
          this.addMsg(c.name, r.text);
          if (r.give > 0) {
            this.save.stats = applyEffects(this.save.stats, { money: r.give });
            this.addTx(`From ${c.name}`, r.give);
            this.addMsg('OPay', `Credit alert! +${naira(r.give)} from ${c.name}. Balance: ${naira(this.save.stats.money)}`);
            this.audio.coin();
          }
          this.persist();
        }, 2500 + Math.random() * 2500);
        return `Request for ${naira(amount)} sent to ${c.name} ✅ Wait for their reply.`;
      },
      email: () => playerEmail(this.save.character.name, this.role),
      roleName: () => this.role?.name ?? null,
      payBill: (id) => {
        const bill = BILLS.find((x) => x.id === id);
        if (!bill) return 'Unknown bill';
        return this.bankOp({ label: bill.label, amount: -bill.amount, clout: bill.clout, reply: bill.reply, endsBlackout: bill.endsBlackout });
      },
      call: (c) => this.phoneCall(c),
      toggleMute: () => this.toggleMute(),
      setMusicVolume: (v) => {
        this.save.settings.musicVolume = v;
        this.audio.setMusicVolume(v);
      },
      setQuality: (q) => {
        this.save.settings.quality = q;
        this.applySettings(this.save.settings);
        this.persist();
      },
      openMap: () => this.openMap(),
      openTravel: () => this.openTravel('pause'),
      openSettings: () => {
        this.state = 'paused';
        this.menus.openSettingsFrom('pause');
      },
      save: () => this.persist(),
      click: () => this.audio.click(),
    });
    this.phone.onClose = () => {
      if (this.state !== 'phone') return;
      this.state = 'play';
      this.hud.setVisible(true);
      this.refreshTouch();
      this.lockPointer();
    };
    this.phoneBtn = $('phonebtn') as HTMLButtonElement;
    this.phoneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.state === 'play') this.openPhone();
    });
    this.phoneBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.muteBtn = $('mute') as HTMLButtonElement;
    this.muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMute();
    });
    this.muteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    show(this.muteBtn, true);
    this.syncMute();
    this.input.onDeviceChange = (d) => {
      this.hud.device = d;
      this.refreshTouch();
    };
    // Sound is on by default. Browsers only allow audio after the first tap/click/key,
    // so start (or retry) the music on the very first interaction anywhere.
    const unlock = () => {
      this.audio.unlock();
      if (this.audio.music.mode === 'off') this.audio.music.setMode(this.indoor?.music ?? 'city');
      else if (!this.audio.music.playing) this.audio.music.retry();
      window.setTimeout(() => this.syncSoundHint(), 300);
    };
    for (const ev of ['pointerdown', 'keydown', 'touchstart', 'click'] as const) window.addEventListener(ev, unlock, { passive: true });
    this.canvas.addEventListener('click', () => {
      if (this.state === 'play' && this.input.device !== 'touch') this.input.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      if (this.input.pointerLocked) return;
      if (this.expectUnlock) {
        this.expectUnlock = false;
        return;
      }
      if (this.state === 'play') this.pause();
    });
    $('rotate-dismiss').addEventListener('click', () => document.body.classList.add('rotate-ok'));
  }

  // ---------------------------------------------------------------- states
  private refreshTouch(): void {
    const on = this.input.device === 'touch' && (this.state === 'play' || this.state === 'dialogue');
    this.touchUi.setVisible(on && this.state === 'play');
    document.body.classList.toggle('touch-mode', this.input.device === 'touch');
  }

  private goMenu(): void {
    this.state = 'menu';
    this.unlockPointer();
    this.hud.setVisible(false);
    this.customizer.close();
    show($('map'), false);
    this.menus.showMain(loadSave() !== null && this.save.pos !== null);
    this.refreshTouch();
  }

  private newGame(): void {
    this.state = 'customize';
    this.menus.hideAll();
    this.hud.setVisible(false);
    // 1) Pick a role, 2) customise the look (pre-dressed for the role), 3) pick where to start.
    this.rolePicker.show((role) => {
      this.rolePicker.close();
      const base = upgradeCharacter({ ...this.save.character });
      const look = { ...role.look };
      const dressed: CharacterConfig = { ...base, ...look };
      this.customizer.open(dressed, 'new', (cfg) => {
        this.customizer.close();
        this.beginLife(cfg, role);
      });
    }, () => {
      this.rolePicker.close();
      this.goMenu();
    });
  }

  private beginLife(cfg: CharacterConfig, role: Role): void {
    const settings = this.save.settings;
    this.save = newSave(cfg);
    this.save.settings = settings;
    this.save.role = role.id;
    const bonus = STARTING_STATS[cfg.background];
    this.save.stats = { money: role.money + bonus.money, clout: role.clout + bonus.clout };
    this.save.lastSalaryDay = 1;
    this.flags = new Set(['role:' + role.id]);
    this.hour = 8.5;
    this.day = 1;
    this.playTime = 0;
    this.events.markFired('mummy', 0);
    this.playerChar.build(cfg);
    this.leaveCar(true);
    this.resetCars();
    this.player.teleport(SPAWN.x, SPAWN.z, SPAWN.heading);
    this.rig.snapBehind(SPAWN.heading);
    this.addTx('Opening balance', role.money);
    if (bonus.money) this.addTx(`Gift from home (${cfg.background})`, bonus.money);
    this.addMsg('OPay', `Welcome to OPay, ${cfg.name}! Your account is ready with ${naira(this.save.stats.money)}. Spend wisely for Abuja 😉`, false);
    this.addMsg('Mummy ❤️', 'My child, you don reach Abuja? Call me when you settle. Love you!', false);
    this.addMail('Abuja Life', `Welcome to Abuja, ${cfg.name}!`, `Your email address is ${playerEmail(cfg.name, role)}.\n\nYou are now a ${role.name}. ${role.blurb}\n\n${role.salary ? `Your pay of ${naira(role.salary)} lands in your OPay account every morning at 8am.` : 'You earn money by working — go to ' + role.workplace.name + ' and open the quick actions.'}\n\nPerk: ${role.perk}`, false);
    this.addMail(role.workplace.name, role.email.welcome.subject, role.email.welcome.body, false);
    this.persist();
    this.openTravel('start');
  }

  get role(): Role | null {
    return roleById(this.save.role);
  }

  /** Daily pay at 8am for salaried roles. */
  private payday(): void {
    const role = this.role;
    if (!role || !role.salary) return;
    if (this.day <= this.save.lastSalaryDay || this.hour < 8) return;
    const days = Math.min(3, this.day - this.save.lastSalaryDay);
    this.save.lastSalaryDay = this.day;
    const amount = role.salary * days;
    this.save.stats = applyEffects(this.save.stats, { money: amount });
    this.addTx(`Salary — ${role.salaryFrom}`, amount);
    this.addMsg('OPay', `Credit alert! +${naira(amount)} from ${role.salaryFrom}. Balance: ${naira(this.save.stats.money)}`);
    this.addMail(role.salaryFrom, `Payslip — Day ${this.day}`, `Dear ${this.save.character.name},\n\n${naira(amount)} has been paid into your OPay account${days > 1 ? ` for ${days} days` : ''}.\n\nRole: ${role.name}\nWorkplace: ${role.workplace.name}`, false);
    this.audio.coin();
  }

  /** Hours until the player can work again (0 = ready). */
  private workCooldown(): number {
    return Math.max(0, this.save.lastWorkAbs + 8 - (this.day * 24 + this.hour));
  }

  private nearWorkplace(x: number, z: number): boolean {
    const r = this.role;
    return !!r && !this.indoor && Math.hypot(r.workplace.x - x, r.workplace.z - z) < 40;
  }

  /** "Go to work" from the quick panel: time passes, money and clout come in. */
  private doWork(): void {
    const role = this.role;
    if (!role || this.state !== 'play') return;
    const wait = this.workCooldown();
    if (wait > 0) {
      this.hud.notify(`You don work already. Rest small — come back in ${Math.ceil(wait)}h.`, 'bad');
      return;
    }
    const w = role.work;
    const pay = Math.round((w.pay[0] + Math.random() * (w.pay[1] - w.pay[0])) / 50) * 50;
    const line = w.lines[Math.floor(Math.random() * w.lines.length)];
    this.save.lastWorkAbs = this.day * 24 + this.hour;
    this.beginDialogue(null);
    this.dialogue.start({
      title: role.workplace.name,
      speaker: `${role.name} life`,
      lines: [line],
      choices: [{ text: pay > 0 ? `Collect ${naira(pay)}` : 'Close shop for today' }],
      onChoice: () => ({
        text: pay > 0 ? `Work don finish. ${naira(pay)} enter your OPay.` : 'Work don finish. Na experience you gain today.',
        tags: this.applyOutcome({ text: '', effects: { money: pay, clout: w.clout, timeSkip: w.hours } }, `Work — ${role.workplace.name}`),
      }),
      onClose: () => this.endDialogue(),
    });
  }

  // ---------------------------------------------------------------- phone
  private openPhone(screen?: 'home' | 'bank' | 'messages'): void {
    this.state = 'phone';
    this.unlockPointer();
    this.hud.setPrompt(null, '');
    this.touchUi.setVisible(false);
    this.player.vx = this.player.vz = 0;
    this.phone.show(screen ?? 'home');
    this.audio.click();
  }

  addMsg(from: string, text: string, notify = true): void {
    this.save.phone.messages.push({ id: uid('m'), from, text, day: this.day, hour: this.hour, read: false });
    if (this.save.phone.messages.length > 150) this.save.phone.messages.splice(0, this.save.phone.messages.length - 150);
    if (notify && (this.state === 'play' || this.state === 'phone')) {
      this.hud.notify(`📩 ${from}: ${text.length > 46 ? text.slice(0, 44) + '…' : text}`, 'info');
      this.audio.chime();
    }
    this.syncPhoneBadge();
    this.phone?.refresh();
  }

  addMail(from: string, subject: string, body: string, notify = true): void {
    this.save.phone.mail.push({ id: uid('e'), from, subject, body, day: this.day, hour: this.hour, read: false });
    if (this.save.phone.mail.length > 80) this.save.phone.mail.splice(0, this.save.phone.mail.length - 80);
    if (notify && (this.state === 'play' || this.state === 'phone')) {
      this.hud.notify(`✉️ ${from}: ${subject}`, 'info');
      this.audio.chime();
    }
    this.syncPhoneBadge();
    this.phone?.refresh();
  }

  addTx(label: string, amount: number): void {
    if (!amount) return;
    this.save.phone.txs.push({ id: uid('t'), label, amount, day: this.day, hour: this.hour });
    if (this.save.phone.txs.length > 150) this.save.phone.txs.splice(0, this.save.phone.txs.length - 150);
  }

  private setFlag(f: string): void {
    if (this.flags.has(f)) return;
    this.flags.add(f);
    const t = FLAG_TEXTS[f];
    if (t) window.setTimeout(() => this.addMsg(t.from, t.text), 2500);
  }

  private syncPhoneBadge(): void {
    if (!this.phoneBtn) return;
    const n = this.save.phone.messages.filter((m) => !m.read).length + this.save.phone.mail.filter((m) => !m.read).length;
    this.phoneBtn.dataset.badge = n ? String(n) : '';
    this.touchUi?.setPhoneBadge(n);
  }

  /** Money movement from the phone (transfers, airtime, bills). Returns an error message or null. */
  private bankOp(op: { label: string; amount: number; clout: number; reply?: { from: string; text: string }; endsBlackout?: boolean }): string | null {
    if (this.save.stats.money + op.amount < 0) return 'Insufficient balance. Abeg fund your wallet.';
    this.save.stats = applyEffects(this.save.stats, { money: op.amount, clout: op.clout });
    this.addTx(op.label, op.amount);
    if (op.endsBlackout) this.blackout = 0;
    if (op.amount < 0) this.audio.click();
    const reply = op.reply;
    if (reply) window.setTimeout(() => this.addMsg(reply.from, reply.text), 1800);
    this.persist();
    return null;
  }

  private phoneCall(c: Contact): void {
    if (c.action === 'taxi') {
      if (this.indoor) {
        this.hud.notify('Danladi: "Abeg come outside first, I dey for road."', 'bad');
        this.state = 'play';
        this.refreshTouch();
        return;
      }
      if (this.save.stats.money < TAXI_FARE) {
        this.hud.notify('You no get ₦2,500 for transport. Waka go!', 'bad');
        this.state = 'play';
        this.refreshTouch();
        return;
      }
      this.openTravel('taxi');
    }
  }

  /** Per-frame: morning texts from Mummy, group chat banter. */
  private phoneTick(): void {
    this.payday();
    const ph = this.save.phone;
    if (this.day > ph.lastMorningDay && this.hour >= 7.5 && this.hour < 12) {
      ph.lastMorningDay = this.day;
      const t = morningText(this.day);
      this.addMsg(t.from, t.text);
    }
    const abs = this.day * 24 + this.hour;
    if (ph.lastGroupHour === 0) ph.lastGroupHour = abs;
    if (abs - ph.lastGroupHour >= 5) {
      ph.lastGroupHour = abs;
      const t = groupText(Math.floor(abs));
      this.addMsg(t.from, t.text);
    }
  }

  /** The location picker shown after New Life / Continue, from pause and from the map. */
  private openTravel(mode: TravelMode): void {
    const prev = this.state;
    this.state = 'travel';
    this.unlockPointer();
    this.menus.hideAll();
    show($('map'), false);
    this.hud.setVisible(false);
    this.refreshTouch();
    this.setAerial(true);
    const p = this.playerPos();
    const back = mode === 'pause' || mode === 'taxi' ? () => {
      this.setAerial(false);
      if (prev === 'paused') {
        this.state = 'paused';
        this.menus.showPause();
      } else this.startPlay();
    } : undefined;
    const r = this.role;
    const work: TravelSpot | undefined = r ? {
      id: 'work', name: 'Your workplace', area: r.workplace.name, featured: false, color: r.color,
      desc: `Go to work as ${r.name}: ${r.work.label.toLowerCase()}.`, x: r.workplace.x, z: r.workplace.z, heading: r.workplace.heading,
    } : undefined;
    this.travel.show(mode, (c) => this.travelTo(c, mode), back, mode === 'continue' ? { x: p.x, z: p.z } : undefined, work);
  }

  /** Bird's-eye view: lift the fog so the whole city is visible from above. */
  private setAerial(on: boolean): void {
    if (on === this.aerial) return;
    this.aerial = on;
    const fog = this.scene.fog as THREE.Fog;
    if (on) {
      fog.near = 2500;
      fog.far = 6000;
      this.camera.far = 6000;
      this.camera.updateProjectionMatrix();
      this.travelT = 0;
    } else this.applyTier(this.tier);
  }

  private updateTravelCamera(dt: number): void {
    this.travelT += dt;
    // Frame the whole map (x -920..560, z -420..420) for the current aspect ratio.
    const cx = -180 + Math.sin(this.travelT * 0.06) * 25;
    const cz = 10;
    const aspect = this.camera.aspect;
    const vf = (this.camera.fov * Math.PI) / 360;
    const hf = Math.atan(Math.tan(vf) * aspect);
    const pitch = 1.02;
    const dW = 780 / Math.tan(hf);
    const dH = 560 / Math.tan(vf);
    const d = Math.max(dW, dH) * 0.92;
    this.camera.position.set(cx, Math.sin(pitch) * d, cz + Math.cos(pitch) * d);
    this.camera.lookAt(cx, 0, cz - 40);
    this.focus.set(cx, 0, cz);
    this.dayNight.update(16.6, this.focus, this.camera);
    updateGlowMaterials(this.glowMats, this.dayNight.night, 0);
    this.traffic.update(dt, []);
    for (const a of this.animators) a(this.time, dt);
    const v = new THREE.Vector3();
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.travel.update((x, y, z) => {
      v.set(x, y, z).project(this.camera);
      return { sx: (v.x * 0.5 + 0.5) * W, sy: (-v.y * 0.5 + 0.5) * H, visible: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 };
    });
  }

  private travelTo(c: TravelChoice, mode: TravelMode): void {
    const name = this.save.character.name;
    this.setAerial(false);
    if (mode === 'taxi') {
      if (c === 'stay' || c === 'gate') return this.startPlay();
      const err = this.bankOp({ label: 'One-Way taxi (Danladi)', amount: -TAXI_FARE, clout: 0 });
      if (err) {
        this.startPlay();
        this.hud.notify(err, 'bad');
        return;
      }
    }
    if (c === 'stay') {
      this.startPlay();
      this.hud.showToast(`WELCOME BACK, ${name.toUpperCase()}`, 'Abuja missed you small.');
      return;
    }
    const spot: { x: number; z: number; heading: number } = c === 'gate' ? SPAWN : c;
    this.leaveCar(true);
    this.fadeTeleport(spot.x, spot.z, spot.heading, () => {
      this.startPlay();
      if (c === 'gate') this.hud.showToast('WELCOME TO ABUJA', `Oya ${name}, talk to Uncle Emeka (!) beside you`);
      else this.hud.showToast((c as TravelSpot).name.toUpperCase(), (c as TravelSpot).desc);
      if (mode === 'taxi') this.hud.notify('Danladi: "We don reach! Abeg rate me 5 stars."', 'good');
      if (mode === 'start' && c !== 'gate') this.hud.notify('Tip: open your phone (Q) or the map (M) to travel again.', 'info');
      this.persist();
    });
  }

  /** Fade to black, move the player, fade back. */
  private fadeTeleport(x: number, z: number, heading: number, after?: () => void): void {
    if (this.fading) return;
    this.fading = true;
    const fade = $('fade');
    fade.classList.add('on');
    window.setTimeout(() => {
      this.teleport(x, z, heading);
      this.district = null;
      after?.();
      window.setTimeout(() => {
        fade.classList.remove('on');
        this.fading = false;
      }, 120);
    }, 280);
  }

  private toggleMute(): void {
    this.audio.unlock();
    this.save.settings.muted = !this.save.settings.muted;
    this.audio.setMuted(this.save.settings.muted);
    if (!this.save.settings.muted && this.audio.music.mode === 'off') this.audio.music.setMode(this.indoor?.music ?? 'city');
    this.syncMute();
    this.persist();
  }

  /** "Tap anywhere for sound" pill: visible on menus until the browser lets audio play. */
  private syncSoundHint(): void {
    const el = document.getElementById('soundhint');
    if (!el) return;
    const menuish = this.state === 'menu' || this.state === 'travel' || this.state === 'customize' || this.state === 'loading';
    show(el, menuish && !this.save.settings.muted && !(this.audio.running && this.audio.music.playing));
  }

  private syncMute(): void {
    const m = this.save.settings.muted;
    this.muteBtn.classList.toggle('muted', m);
    this.muteBtn.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
    this.muteBtn.title = m ? 'Unmute (N)' : 'Mute (N)';
  }

  private continueGame(): void {
    const s = loadSave();
    if (s) this.save = s;
    this.flags = new Set(this.save.flags);
    this.hour = this.save.hour;
    this.day = this.save.day;
    this.playerChar.build(this.save.character);
    this.leaveCar(true);
    const p = this.save.pos ?? { x: SPAWN.x, z: SPAWN.z, heading: SPAWN.heading };
    const q = { x: p.x, z: p.z };
    this.world.resolveCircle(q, 0.4, 0, false);
    this.player.teleport(q.x, q.z, p.heading);
    this.rig.snapBehind(p.heading);
    this.menus.hideAll();
    this.syncPhoneBadge();
    if (!this.role) {
      // Saves from before roles existed: pick one now, keep your money.
      this.state = 'customize';
      this.rolePicker.show((role) => {
        this.rolePicker.close();
        this.save.role = role.id;
        this.save.lastSalaryDay = this.day;
        this.flags.add('role:' + role.id);
        this.addMail('Abuja Life', `You are now a ${role.name}`, `${role.blurb}\n\nYour email: ${playerEmail(this.save.character.name, role)}\nWorkplace: ${role.workplace.name}\nPerk: ${role.perk}`, false);
        this.persist();
        this.openTravel('continue');
      });
      return;
    }
    this.openTravel('continue');
  }

  private startPlay(): void {
    this.state = 'play';
    const role = this.role;
    this.hud.setRole(role ? `${this.save.character.name} · ${role.name}` : this.save.character.name, role?.color);
    this.syncPhoneBadge();
    this.hud.setVisible(true);
    this.hud.resetDeltas();
    this.district = null;
    this.sampler.reset();
    this.refreshTouch();
    this.lockPointer();
    this.minimap.resize();
  }

  private pause(): void {
    if (this.state !== 'play') return;
    this.state = 'paused';
    this.unlockPointer();
    this.menus.showPause();
    this.persist();
    this.refreshTouch();
  }

  private resume(): void {
    this.menus.hideAll();
    this.state = 'play';
    this.refreshTouch();
    this.lockPointer();
  }

  private openMap(): void {
    this.state = 'map';
    this.unlockPointer();
    show($('map'), true);
    this.refreshTouch();
    this.drawFullMap();
  }

  private closeMap(): void {
    show($('map'), false);
    this.state = 'play';
    this.refreshTouch();
    this.lockPointer();
  }

  private lockPointer(): void {
    if (this.input.device !== 'touch') this.input.requestPointerLock();
  }

  private unlockPointer(): void {
    if (this.input.pointerLocked) {
      this.expectUnlock = true;
      this.input.exitPointerLock();
    }
  }

  // -------------------------------------------------------------- settings
  applySettings(s: Settings): void {
    this.save.settings = s;
    this.input.bindings = mergeBindings(s.bindings);
    this.hud.bindings = this.input.bindings;
    this.input.sensitivity = s.sensitivity;
    this.input.invertY = s.invertY;
    this.audio.setVolume(s.volume);
    this.audio.setMusicVolume(s.musicVolume);
    this.audio.setMuted(s.muted);
    if (this.muteBtn) this.syncMute();
    const tier = s.quality === 'auto' ? this.tier : s.quality;
    this.applyTier(tier);
  }

  private applyTier(t: Tier): void {
    const prevShadows = this.renderer.shadowMap.enabled;
    this.tier = t;
    const cfg = TIERS[t];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.pixelRatio));
    this.renderer.shadowMap.enabled = cfg.shadows;
    this.dayNight.sun.castShadow = cfg.shadows;
    (this.scene.fog as THREE.Fog).far = cfg.fogFar;
    (this.scene.fog as THREE.Fog).near = cfg.fogFar * 0.3;
    this.camera.far = cfg.fogFar + 60;
    this.camera.updateProjectionMatrix();
    this.traffic.setActive(cfg.traffic);
    this.npcs.setActive(cfg.walkers);
    this.npcs.cullDist = cfg.npcCullDist;
    this.npcs.setShadows(cfg.shadows);
    if (prevShadows !== cfg.shadows) {
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
        else if (m) (m as THREE.Material).needsUpdate = true;
      });
    }
    this.resize();
  }

  private resize(): void {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    this.renderer.setSize(w, hgt, false);
    this.camera.aspect = w / hgt;
    this.camera.updateProjectionMatrix();
    this.minimap?.resize();
    if (this.state === 'map') this.drawFullMap();
  }

  // ------------------------------------------------------------------ loop
  private tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    this.input.update();
    document.body.classList.toggle('playing', this.state === 'play' || this.state === 'dialogue');
    if (this.input.wasPressed('mute')) this.toggleMute();
    const playing = this.state === 'play';
    this.quick.root.style.display = playing ? '' : 'none';
    if (!playing && this.emotes.open) this.emotes.close();
    switch (this.state) {
      case 'play':
        this.updatePlay(dt);
        break;
      case 'dialogue':
        this.updateDialogue(dt);
        break;
      case 'map':
        if (this.input.wasPressed('map') || this.input.wasPressed('pause')) this.closeMap();
        this.updateWorld(dt, false);
        break;
      case 'paused':
        if (this.input.wasPressed('pause') && !this.menus.backOut()) this.resume();
        break;
      case 'menu':
        if (this.input.wasPressed('pause')) this.menus.backOut();
        this.updateMenuCamera(dt);
        break;
      case 'customize':
        break;
      case 'travel':
        this.updateTravelCamera(dt);
        break;
      case 'phone':
        this.updatePhone(dt);
        break;
    }
    if (this.state === 'customize') {
      this.customizer.update(dt, window.innerWidth, window.innerHeight);
      this.renderer.render(this.customizer.scene, this.customizer.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.input.endFrame();
  }

  private updatePhone(dt: number): void {
    const inp = this.input;
    if (inp.wasPressed('phone')) this.phone.close();
    else if (inp.wasPressed('pause')) this.phone.back();
    this.updateWorld(dt, true);
    this.phoneTick();
    const p = this.playerPos();
    this.rig.update(dt, { x: 0, y: 0 }, new THREE.Vector3(p.x, this.car ? 1.7 : 1.5, p.z), this.world, { distance: this.car ? 8.5 : this.indoor ? 3.6 : 5.2 });
    this.minimapTimer -= dt;
    if (this.minimapTimer <= 0) {
      this.minimapTimer = 1;
      this.phone.refresh();
    }
  }

  private updateMenuCamera(dt: number): void {
    this.menuAngle += dt * 0.04;
    const c = new THREE.Vector3(60, 0, -40);
    const r = 260;
    this.camera.position.set(c.x + Math.cos(this.menuAngle) * r, 90, c.z + Math.sin(this.menuAngle) * r);
    this.camera.lookAt(c.x, 20, c.z);
    this.focus.copy(c);
    this.dayNight.update(18.1, this.focus, this.camera);
    updateGlowMaterials(this.glowMats, this.dayNight.night, 0);
    if (this.poolMat) this.poolMat.opacity = this.dayNight.night * 0.32;
    this.traffic.update(dt, []);
    this.npcs.update(dt, c.x, c.z, this.time, () => 0, this.dayNight.night);
    for (const a of this.animators) a(this.time, dt);
  }

  private eventCtx(): EventContext {
    return {
      district: this.district,
      hour: this.hour,
      inCar: this.car !== null,
      outfit: this.save.character.outfit,
      background: this.save.character.background,
      stats: this.save.stats,
      flags: this.flags,
      role: this.save.role,
    };
  }

  private playerPos(): { x: number; z: number; heading: number } {
    if (this.car) return { x: this.car.x, z: this.car.z, heading: this.car.heading };
    return { x: this.player.x, z: this.player.z, heading: this.player.heading };
  }

  /** Shared per-frame world simulation: time, traffic, NPCs, lights. */
  private updateWorld(dt: number, advanceClock: boolean): void {
    if (advanceClock) {
      this.hour += dt / this.dayNight.secondsPerHour;
      if (this.hour >= 24) {
        this.hour -= 24;
        this.day++;
      }
    }
    const p = this.playerPos();
    this.traffic.update(dt, [p, ...this.npcs.pedestrians()]);
    this.npcs.update(dt, p.x, p.z, this.time, (id) => this.events.cooldownLeft(id, this.playTime), this.dayNight.night);
    this.parkedDyn.length = 0;
    for (const c of this.cars) {
      if (c === this.car) continue;
      const f = c.forward;
      this.parkedDyn.push({ x: c.x + f.x * 1.3, z: c.z + f.z * 1.3, r: 1.05 }, { x: c.x - f.x * 1.3, z: c.z - f.z * 1.3, r: 1.05 });
    }
    this.crowds.update(dt, p.x, p.z);
    this.world.dynamics = [...this.traffic.dynamics, ...this.npcs.dynamics, ...this.parkedDyn, ...this.crowds.dynamics];
    const inside = interiorAt(p.x, p.z);
    if (inside !== this.indoor) {
      this.indoor = inside;
      this.dayNight.indoor = inside?.light ?? null;
      this.audio.music.setMode(this.save.settings.muted && this.audio.music.mode === 'off' ? 'off' : inside?.music ?? 'city');
    }
    if (this.blackout > 0) this.blackout -= dt;
    const bo = worldUniforms.uBlackout.value;
    worldUniforms.uBlackout.value = bo + ((this.blackout > 0 ? 1 : 0) - bo) * Math.min(1, dt * 4);
    this.focus.set(p.x, 0, p.z);
    this.dayNight.update(this.hour, this.focus, this.camera);
    updateGlowMaterials(this.glowMats, this.dayNight.night, worldUniforms.uBlackout.value);
    if (this.poolMat) this.poolMat.opacity = this.dayNight.night * 0.32 * (1 - worldUniforms.uBlackout.value);
    for (const c of this.cars) c.setNight(this.dayNight.night);
    for (const a of this.animators) a(this.time, dt);
  }

  private nearestNpc(x: number, z: number, maxD: number): NpcSpot | null {
    let best: NpcSpot | null = null;
    let bd = maxD * maxD;
    for (const s of NPC_SPOTS) {
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  private nearestPortal(x: number, z: number, maxD: number): Portal | null {
    let best: Portal | null = null;
    let bd = maxD * maxD;
    for (const pt of PORTALS) {
      const d = (pt.x - x) ** 2 + (pt.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = pt;
      }
    }
    return best;
  }

  private usePortal(pt: Portal): void {
    if (pt.gate === 'cage') {
      const open = this.hour >= 20 || this.hour < 5;
      if (!open) {
        this.hud.notify('The Cage never open. Come back by 9pm.', 'bad');
        return;
      }
      if (!this.flags.has('cageRegular')) {
        this.hud.notify('Bouncer Big Joe dey check people. Talk to am first.', 'bad');
        return;
      }
    }
    this.audio.door();
    this.fadeTeleport(pt.to.x, pt.to.z, pt.to.heading);
  }

  private nearestCar(x: number, z: number, maxD: number): Vehicle | null {
    let best: Vehicle | null = null;
    let bd = maxD * maxD;
    for (const c of this.cars) {
      if (c === this.car) continue;
      const d = (c.x - x) ** 2 + (c.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  private updatePlay(dt: number): void {
    const inp = this.input;
    if (inp.wasPressed('pause')) {
      this.pause();
      return;
    }
    if (inp.wasPressed('map')) {
      this.openMap();
      return;
    }
    if (inp.wasPressed('phone')) {
      this.stopEmote();
      this.openPhone();
      return;
    }
    if (inp.wasPressed('cursor') && inp.device === 'keyboard') {
      if (this.input.pointerLocked) this.unlockPointer();
      else this.lockPointer();
    }
    if (inp.wasPressed('dance') && !this.car) {
      if (this.playerChar.isEmoting || this.emotes.open) this.stopEmote();
      else this.emotes.show(this.input.device === 'touch');
    }
    this.phoneTick();
    this.playTime += dt;
    this.updateWorld(dt, true);
    const look = inp.look(dt);
    const move = inp.move();
    const analog = inp.device !== 'keyboard';
    let prompt: { action: 'interact' | 'vehicle' | 'give'; text: string; touch: string } | null = null;

    if (this.car) {
      const car = this.car;
      car.update(dt, { throttle: move.y, steer: move.x, handbrake: inp.isHeld('jump'), nitro: inp.isHeld('sprint') }, this.world);
      if (car.impact > 2) {
        this.rig.addShake(Math.min(1, car.impact / 15));
        this.audio.bump(car.impact);
      }
      this.player.x = car.x;
      this.player.z = car.z;
      if (inp.wasPressed('horn')) this.audio.horn();
      if (inp.wasPressed('vehicle')) this.leaveCar(false);
      this.audio.engine(car.speed);
      const sp = Math.hypot(car.vx, car.vz);
      const vh = sp > 2 ? Math.atan2(car.vx, car.vz) : car.heading;
      const followHeading = car.speed < -1 ? car.heading : vh;
      if (inp.wasPressed('camera')) this.rig.snapBehind(car.heading);
      this.rig.update(dt, look, new THREE.Vector3(car.x, 1.7, car.z), this.world, { distance: 8.5, followHeading, followDelay: 0.6, speed: sp });
      this.hud.setSpeed(sp * 3.6);
    } else {
      const jumped = this.player.update(dt, move, this.rig.yaw, inp.isHeld('sprint'), inp.wasPressed('jump'), this.world, analog);
      if (jumped) this.audio.jump();
      const moving = this.player.speed > 0.5;
      if (inp.wasPressed('camera')) this.rig.snapBehind(this.player.heading);
      this.rig.maxPitch = this.indoor ? 0.75 : 1.2;
      this.rig.update(dt, look, new THREE.Vector3(this.player.x, 1.45 + this.player.y, this.player.z), this.world, {
        distance: this.indoor ? 3.6 : 5.2,
        followHeading: analog && moving && move.y > 0.3 ? this.player.heading : undefined,
        followDelay: 0.8,
      });
      this.audio.engine(null);
      this.hud.setSpeed(null);
      const npc = this.nearestNpc(this.player.x, this.player.z, 3.2);
      const car = this.indoor ? null : this.nearestCar(this.player.x, this.player.z, 3.8);
      const portal = this.nearestPortal(this.player.x, this.player.z, 2.6);
      // Walking into an exit door takes you outside (no more stepping into the void).
      if (portal && portal.id.endsWith('-out') && !this.fading && Math.hypot(portal.x - this.player.x, portal.z - this.player.z) < 2.4 && this.player.speed > 0.5) {
        const toDoor = (portal.x - this.player.x) * this.player.vx + (portal.z - this.player.z) * this.player.vz;
        if (toDoor > 0) {
          this.usePortal(portal);
          return;
        }
      }
      if (portal && (!npc || Math.hypot(portal.x - this.player.x, portal.z - this.player.z) < Math.hypot(npc.x - this.player.x, npc.z - this.player.z))) {
        prompt = { action: 'interact', text: portal.label, touch: 'Enter' };
        if (inp.wasPressed('interact')) {
          this.usePortal(portal);
          return;
        }
      } else if (npc) prompt = { action: 'interact', text: npc.look === 'none' ? npc.name : `Talk to ${npc.name}`, touch: npc.look === 'none' ? 'Use' : 'Talk' };
      else if (car) prompt = { action: 'vehicle', text: `Enter ${CAR_MODELS[car.model].label}`, touch: 'Enter' };
      if (npc && !prompt?.text.startsWith('Enter') && !prompt?.text.startsWith('Exit') && inp.wasPressed('interact')) {
        this.talkTo(npc);
        return;
      }
      if (car && inp.wasPressed('vehicle')) this.enterCar(car);
      if (moving && this.playerChar.pose !== 'normal') this.stopEmote();
      this.giveTarget = this.findGiveTarget(this.player.x, this.player.z);
      if (this.giveTarget && !prompt) prompt = { action: 'give', text: this.role?.id === 'almajiri' ? `Ask ${this.giveTarget.name} for sadaka` : `Give ${this.giveTarget.name} cash`, touch: 'Give' };
      if (this.giveTarget && inp.wasPressed('give')) {
        this.giveCash(this.giveTarget);
        return;
      }
    }
    if (this.car && this.car.speed < 1 && this.nearestNpc(this.car.x, this.car.z, 4)) {
      const npc = this.nearestNpc(this.car.x, this.car.z, 4)!;
      prompt = { action: 'interact', text: `Talk to ${npc.name}`, touch: 'Talk' };
      if (inp.wasPressed('interact')) {
        this.talkTo(npc);
        return;
      }
    }

    // Auto-triggered NPCs (checkpoints).
    const p = this.playerPos();
    for (const s of NPC_SPOTS) {
      if (!s.auto) continue;
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      const inCar = this.car !== null;
      const trig = (s.auto === 'car' && inCar && d < 11) || (s.auto === 'foot' && !inCar && d < 3.5) || (s.auto === 'any' && d < (inCar ? 11 : 4));
      if (trig && this.events.forNpc(s.eventId, this.eventCtx(), this.playTime)) {
        this.talkTo(s);
        return;
      }
    }

    // Districts & zone events.
    const d = districtAt(p.x, p.z);
    const id = this.indoor ? 'in:' + this.indoor.id : d?.id ?? 'outskirts';
    if (id !== this.district) {
      const first = this.district === null;
      this.district = id;
      const name = this.indoor?.name ?? d?.name ?? 'FCT Outskirts';
      this.hud.setDistrict(name);
      if (!first || this.playTime > 1) {
        this.hud.showToast(name.toUpperCase(), this.indoor?.tagline ?? d?.tagline ?? 'Bush road. Watch out for potholes.');
        this.audio.chime();
      }
    }
    if (this.playTime > 20) {
      const ctx = this.eventCtx();
      const ev = this.events.zoneCheck(ctx, this.playTime) ?? this.events.randomTick(ctx, this.playTime, dt);
      if (ev) {
        this.startEvent(ev, null);
        return;
      }
    }

    // HUD
    this.hud.setStats(this.save.stats.money, this.save.stats.clout, this.hour, this.day);
    this.hud.setPrompt(prompt?.action ?? null, prompt?.text ?? '');
    this.hud.updateHints(this.save.settings.showHints, this.car !== null);
    this.touchUi.setContext(this.car !== null, prompt?.action === 'give' ? null : prompt?.touch ?? null, this.giveTarget && !this.car ? 'Give' : null);
    this.updateQuick(p.x, p.z);
    this.minimapTimer -= dt;
    if (this.minimapTimer <= 0) {
      this.minimapTimer = 1 / 24;
      const radius = this.car ? 170 : this.indoor ? 40 : 95;
      this.minimap.draw(p.x, p.z, p.heading, this.rig.yaw, radius, this.markers());
    }
    this.autosave += dt;
    if (this.autosave > 20) {
      this.autosave = 0;
      this.persist();
    }
    // Auto quality: drop a tier if the device struggles.
    if (this.save.settings.quality === 'auto' && this.autoDowngrades < 2) {
      const fps = this.sampler.sample(dt);
      if (fps !== null && fps < 42 && this.tier !== 'low') {
        this.autoDowngrades++;
        this.applyTier(lowerTier(this.tier));
        this.hud.notify(`Graphics set to ${this.tier} for smoother play`, 'info');
        this.sampler.reset();
      }
    }
  }

  private markers(): MapMarker[] {
    const m = npcMarkers((id) => this.events.cooldownLeft(id, this.playTime) <= 0);
    for (const c of this.cars) if (c !== this.car) m.push({ x: c.x, z: c.z, color: '#5aa9ff' });
    m.push({ x: LANDMARKS.home.x, z: LANDMARKS.home.z, color: '#7cf29a', label: 'H' });
    return m;
  }

  private drawFullMap(): void {
    const p = this.playerPos();
    this.fullMap.draw(p.x, p.z, p.heading, this.markers());
  }


  // --------------------------------------------------- quick actions & co
  /** M map: click a place (or anywhere) to teleport there. */
  private mapTeleport(name: string | null, x: number, z: number, heading?: number): void {
    if (this.state !== 'map' || this.fading) return;
    show($('map'), false);
    this.leaveCar(true);
    const q = { x, z };
    if (!name) this.world.resolveCircle(q, 0.5, 0, false);
    this.audio.click();
    this.fadeTeleport(q.x, q.z, heading ?? this.player.heading, () => {
      this.startPlay();
      if (name) this.hud.showToast(name.toUpperCase(), 'Teleport don land you.');
      this.persist();
    });
  }

  /** Fade to a quick-action spot, then start the NPC talk if there is one. */
  private quickGo(it: QuickItem): void {
    if (this.state !== 'play' || this.fading) return;
    this.leaveCar(true);
    this.stopEmote();
    this.fadeTeleport(it.x, it.z, it.heading, () => {
      const spot = it.npc ? NPC_SPOTS.find((n) => n.id === it.npc) : null;
      if (spot) window.setTimeout(() => {
        if (this.state === 'play') this.talkTo(spot);
      }, 350);
    });
  }

  /** Build the side panel for wherever the player is standing. */
  private updateQuick(x: number, z: number): void {
    if (this.car) {
      this.quick.set(null, [], false);
      return;
    }
    const zone = quickZoneAt(this.quickZones, x, z);
    const entries: QuickEntry[] = [];
    const acts: (() => void)[] = [];
    const role = this.role;
    if (role && this.nearWorkplace(x, z)) {
      const wait = this.workCooldown();
      entries.push({ label: role.work.label, icon: '💼', note: wait > 0 ? `Rest first — ready in ${Math.ceil(wait)}h` : `+${role.work.hours}h • ${naira(role.work.pay[0])}–${naira(role.work.pay[1])}`, accent: true });
      acts.push(() => this.doWork());
    }
    if (zone) for (const it of zone.items) {
      entries.push({ label: it.label, icon: it.icon });
      acts.push(() => this.quickGo(it));
    }
    if (!entries.length) {
      this.quick.set(null, [], false);
      return;
    }
    this.quickActs = acts;
    this.quick.set(zone ? `Places in ${zone.name}` : role?.workplace.name ?? 'Work', entries, this.input.device === 'touch');
  }

  private startEmote(id: Character['pose']): void {
    if (this.state !== 'play' || this.car) return;
    this.playerChar.pose = id;
    const e = EMOTES.find((x) => x.id === id);
    if (e) this.hud.notify(`💃🏾 ${e.name}! Move to stop.`, 'info');
    this.audio.click();
    // People nearby hail you (once in a while).
    const p = this.playerPos();
    if (this.playTime - this.cheerAt > 60 && (this.crowds.nearest(p.x, p.z, 10) || this.npcs.nearestWalker(p.x, p.z, 10))) {
      this.cheerAt = this.playTime;
      window.setTimeout(() => {
        if (!this.playerChar.isEmoting) return;
        this.hud.notify('"Ehen! Oya dance! 🔥" People dey hail you.', 'good');
        this.save.stats = applyEffects(this.save.stats, { clout: 1 });
      }, 2500);
    }
  }

  private stopEmote(): void {
    this.emotes.close();
    if (this.playerChar.pose !== 'normal') this.playerChar.pose = 'normal';
  }

  /** Someone close enough to give cash to (event NPC, crowd, or street walker). */
  private findGiveTarget(x: number, z: number): Game['giveTarget'] {
    const spot = NPC_SPOTS.find((s) => s.look !== 'none' && Math.hypot(s.x - x, s.z - z) < 2.6) ?? null;
    if (spot) return { name: spot.name, person: null, spot, almajiri: false };
    const person = this.crowds.nearest(x, z, 2.4) ?? this.npcs.nearestWalker(x, z, 2.4);
    if (!person) return null;
    const almajiri = person.char.cfg.outfit === 'jalabiya';
    const names = ['Passer-by', 'Aunty', 'Oga', 'Bros', 'Mama', 'Young man', 'Sister'];
    const name = almajiri ? 'Almajiri boy' : names[Math.abs(Math.round(person.x * 7 + person.z * 3)) % names.length];
    return { name, person, spot: null, almajiri };
  }

  /** G: give cash to the person in front of you (or, as an almajiri, ask for sadaka). */
  private giveCash(t: NonNullable<Game['giveTarget']>): void {
    this.stopEmote();
    t.person?.hold(8);
    if (t.person) {
      this.player.heading = Math.atan2(t.person.x - this.player.x, t.person.z - this.player.z);
      this.player.sync();
      t.person.char.root.rotation.y = Math.atan2(this.player.x - t.person.x, this.player.z - t.person.z);
    }
    this.beginDialogue(t.spot);
    const money = this.save.stats.money;
    const isAlmajiri = this.role?.id === 'almajiri';
    const amounts = isAlmajiri ? [200] : [200, 1000, 5000];
    const choices = amounts.map((a) => ({ text: `Give ${naira(a)}`, locked: money < a ? `Need ${naira(a)}` : undefined }));
    if (isAlmajiri) choices.unshift({ text: 'Ask for sadaka 🥣', locked: undefined });
    choices.push({ text: 'Abeg, another time', locked: undefined });
    const line = t.almajiri ? '"Sadaka, don Allah! Allah ya saka da alheri." The boy hold out his bowl.' : `${t.name} look you. "Wetin dey happen, my person?"`;
    this.dialogue.start({
      title: isAlmajiri ? 'Sadaka' : 'Give cash',
      speaker: t.name,
      lines: [line],
      choices,
      onChoice: (i) => {
        if (isAlmajiri && i === 0) {
          const begged = this.flags.has('begged:' + this.day + ':' + Math.floor(this.hour));
          const amt = begged ? 0 : [0, 100, 200, 500, 1000][Math.floor(Math.random() * 5)];
          this.flags.add('begged:' + this.day + ':' + Math.floor(this.hour));
          const text = amt ? `${t.name} drop ${naira(amt)} for your bowl. "Allah ya kiyaye."` : begged ? '"I just give you now now! Waka."' : `${t.name} shake head: "I no get change today."`;
          return { text, tags: this.applyOutcome({ text, effects: { money: amt } }, `Sadaka from ${t.name}`) };
        }
        const amt = amounts[isAlmajiri ? i - 1 : i];
        if (amt === undefined) return { text: `${t.name}: "No wahala. God bless you."`, tags: [] };
        const big = amt >= 5000;
        const text = t.almajiri
          ? `The boy smile wide: "Na gode! Allah ya albarkace ka!" ${big ? 'Him friends come greet you too.' : ''}`
          : big ? `${t.name} shout: "Ah! Odogwu! God go bless your hustle!" People turn look you.` : amt >= 1000 ? `${t.name}: "Thank you o! You too much."` : `${t.name}: "Ehn, thank you. E go help small."`;
        const clout = (amt >= 5000 ? 3 : amt >= 1000 ? 1 : 0) + (t.almajiri ? 1 : 0);
        return { text, tags: this.applyOutcome({ text, effects: { money: -amt, clout } }, `Cash gift to ${t.name}`) };
      },
      onClose: () => this.endDialogue(),
    });
  }

  // ------------------------------------------------------------- vehicles
  private enterCar(car: Vehicle): void {
    this.car = car;
    car.occupied = true;
    this.playerChar.root.visible = false;
    this.audio.door();
    this.rig.snapBehind(car.heading);
    this.hud.notify(`${CAR_MODELS[car.model].label} — press ${this.hud.key('horn')} to horn`, 'info');
  }

  private leaveCar(force: boolean): void {
    const car = this.car;
    if (!car) return;
    if (!force && Math.abs(car.speed) > 8) {
      this.hud.notify('Slow down first! You wan jump comot for moving car?', 'bad');
      return;
    }
    const e = car.exitPoint();
    car.occupied = false;
    car.speed = car.vx = car.vz = 0;
    car.setNight(0);
    this.car = null;
    const q = { x: e.x, z: e.z };
    this.world.resolveCircle(q, 0.4, 0);
    this.player.teleport(q.x, q.z, car.heading);
    this.playerChar.root.visible = true;
    this.audio.engine(null);
    if (!force) this.audio.door();
  }

  private resetCars(): void {
    CAR_SPOTS.forEach((s, i) => {
      const c = this.cars[i];
      c.x = s.x;
      c.z = s.z;
      c.heading = s.heading;
      c.speed = c.vx = c.vz = 0;
      c.sync();
    });
  }

  private teleport(x: number, z: number, heading?: number): void {
    if (this.car) {
      this.car.x = x;
      this.car.z = z;
      if (heading !== undefined) this.car.heading = heading;
      this.car.speed = this.car.vx = this.car.vz = 0;
      this.car.sync();
      this.rig.snapBehind(this.car.heading);
    } else {
      this.player.teleport(x, z, heading);
      this.rig.snapBehind(this.player.heading);
    }
  }

  // --------------------------------------------------------------- events
  private talkTo(spot: NpcSpot): void {
    const ev = this.events.get(spot.eventId);
    if (!ev) return;
    const ready = this.events.forNpc(spot.eventId, this.eventCtx(), this.playTime);
    if (ready) {
      this.startEvent(ready, spot);
      return;
    }
    // Not available: explain why.
    const onCooldown = this.events.cooldownLeft(spot.eventId, this.playTime) > 0;
    const line = !onCooldown && ev.unavailable ? ev.unavailable : pickBusyLine(spot.name);
    this.beginDialogue(spot);
    this.dialogue.start({ title: ev.title, speaker: spot.name, lines: [line], choices: null, onClose: () => this.endDialogue() });
  }

  private beginDialogue(spot: NpcSpot | null): void {
    this.state = 'dialogue';
    this.talkingTo = spot;
    this.unlockPointer();
    this.hud.setPrompt(null, '');
    this.touchUi.setVisible(false);
    if (this.car) {
      this.car.speed = this.car.vx = this.car.vz = 0;
      this.audio.engine(null);
    }
    this.player.vx = this.player.vz = 0;
    this.player.char.update(0, 0);
    const npc = spot ? this.npcs.eventNpcs.find((n) => n.spot === spot) : null;
    if (npc?.char) npc.char.talking = true;
  }

  private startEvent(ev: GameEvent, spot: NpcSpot | null): void {
    this.events.markFired(ev.id, this.playTime);
    if (spot) this.setFlag('met:' + spot.id);
    this.beginDialogue(spot);
    const ctx = this.eventCtx();
    // Role-only choices are hidden from everybody else.
    const shown = ev.choices.map((_, i) => i).filter((i) => !ev.choices[i].requires?.role || ev.choices[i].requires!.role!.includes(this.save.role ?? ''));
    this.dialogue.start({
      title: ev.title,
      speaker: ev.speaker,
      lines: linesFor(ev, this.save.character.background),
      choices: shown.map((i) => ev.choices[i]).map((c) => ({ text: c.text, locked: meets(c.requires, ctx) ? undefined : c.lockedHint ?? 'Locked' })),
      onChoice: (k) => {
        const out = this.events.resolve(ev, shown[k], this.eventCtx());
        if (!out) return { text: '…', tags: [] };
        return { text: out.text, tags: this.applyOutcome(out, ev.title) };
      },
      onClose: () => this.endDialogue(),
    });
  }

  private applyOutcome(o: Outcome, label = 'Payment'): { text: string; kind: 'good' | 'bad' | 'info' }[] {
    const fx = o.effects ?? {};
    const before = this.save.stats;
    const after = applyEffects(before, fx);
    const tags: { text: string; kind: 'good' | 'bad' | 'info' }[] = [];
    const dm = after.money - before.money;
    const dc = after.clout - before.clout;
    if (dm) tags.push({ text: `${dm > 0 ? '+' : '−'}${naira(Math.abs(dm))}`, kind: dm > 0 ? 'good' : 'bad' });
    if (dc) tags.push({ text: `${dc > 0 ? '+' : '−'}${Math.abs(dc)} clout`, kind: dc > 0 ? 'good' : 'bad' });
    this.save.stats = after;
    if (dm > 0 || dc > 0) this.audio.coin();
    else if (dm < 0 || dc < 0) this.audio.lose();
    if (fx.flag) this.setFlag(fx.flag);
    if (dm) this.addTx(label, dm);
    if (dm >= 20000) window.setTimeout(() => this.addMsg('OPay', `Credit alert! +${naira(dm)} • ${label}. Balance: ${naira(this.save.stats.money)}`), 1200);
    if (fx.timeSkip) {
      this.hour += fx.timeSkip;
      while (this.hour >= 24) {
        this.hour -= 24;
        this.day++;
      }
      tags.push({ text: `⏱ +${fx.timeSkip}h`, kind: 'info' });
    }
    if (fx.sleep) {
      if (this.hour >= 7) this.day++;
      this.hour = 7;
      tags.push({ text: '☀️ Next morning', kind: 'info' });
    }
    if (fx.blackout) this.blackout = fx.blackout;
    const pending: (() => void)[] = [];
    if (fx.teleport) {
      const t = fx.teleport;
      pending.push(() => this.teleport(t.x, t.z, t.heading));
    }
    if (fx.customize) pending.push(() => this.openWardrobe());
    this.pendingAfterDialogue = pending.length ? () => pending.forEach((f) => f()) : null;
    this.persist();
    return tags;
  }

  private endDialogue(): void {
    const npc = this.talkingTo ? this.npcs.eventNpcs.find((n) => n.spot === this.talkingTo) : null;
    if (npc?.char) npc.char.talking = false;
    this.talkingTo = null;
    this.state = 'play';
    const after = this.pendingAfterDialogue;
    this.pendingAfterDialogue = null;
    after?.();
    if (this.state === 'play') {
      this.refreshTouch();
      this.lockPointer();
    }
  }

  private updateDialogue(dt: number): void {
    const inp = this.input;
    this.dialogue.update(dt);
    if (this.dialogue.choosing) {
      (['choice1', 'choice2', 'choice3', 'choice4'] as const).forEach((a, i) => {
        if (inp.wasPressed(a)) {
          this.audio.click();
          this.dialogue.choose(i);
        }
      });
    } else if (inp.wasPressed('interact') || inp.wasPressed('jump')) {
      this.dialogue.advance();
    }
    if (inp.wasPressed('pause') && !this.dialogue.choosing) this.dialogue.close();
    this.updateWorld(dt, false);
    const p = this.playerPos();
    const spot = this.talkingTo;
    if (spot && !this.car) {
      // Face whoever we're talking to.
      this.player.heading = Math.atan2(spot.x - this.player.x, spot.z - this.player.z);
      this.player.sync();
    }
    const focus = new THREE.Vector3(p.x, this.car ? 1.7 : 1.5, p.z);
    this.rig.update(dt, { x: 0, y: 0 }, focus, this.world, { distance: this.car ? 8.5 : 4.2 });
    this.hud.setStats(this.save.stats.money, this.save.stats.clout, this.hour, this.day);
  }

  private openWardrobe(): void {
    this.state = 'customize';
    this.unlockPointer();
    this.hud.setVisible(false);
    this.refreshTouch();
    this.customizer.open(this.save.character, 'wardrobe', (cfg: CharacterConfig) => {
      this.save.character = cfg;
      this.playerChar.build(cfg);
      this.customizer.close();
      this.hud.setVisible(true);
      this.state = 'play';
      this.refreshTouch();
      this.lockPointer();
      this.hud.notify('Fresh! You don change your drip.', 'good');
      this.persist();
    });
  }

  // ----------------------------------------------------------------- save
  persist(): void {
    if (this.state === 'loading') return;
    const p = this.playerPos();
    this.save.pos = { x: p.x, z: p.z, heading: p.heading };
    this.save.hour = clamp(this.hour, 0, 23.99);
    this.save.day = this.day;
    this.save.flags = [...this.flags];
    writeSave(this.save);
  }
}

const BUSY = [
  'Abeg, I don talk my own. Come back later make we yarn again.',
  'My guy, I dey busy small. Check me later.',
  'Ehen? Again? Give me small time abeg.',
];

function pickBusyLine(name: string): string {
  return BUSY[name.length % BUSY.length];
}
