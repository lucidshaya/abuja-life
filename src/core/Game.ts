import * as THREE from 'three';
import { Audio } from './Audio';
import { CollisionWorld, type Dynamic } from './Collision';
import { Input, mergeBindings } from './Input';
import { FpsSampler, TIERS, guessTier, isTouchDevice, lowerTier, type Tier } from './Quality';
import { loadSave, newSave, writeSave, type SaveData, type Settings } from './Save';
import { clamp } from './rng';
import { EventSystem, applyEffects, linesFor, meets, type EventContext, type GameEvent, type Outcome } from '../events/EventSystem';
import { EVENTS } from '../events/eventsData';
import { CameraRig } from '../player/CameraRig';
import { Character } from '../player/Character';
import { STARTING_STATS, type CharacterConfig } from '../player/CharacterConfig';
import { PlayerController } from '../player/PlayerController';
import { Vehicle } from '../player/Vehicle';
import { buildCity } from '../world/CityBuilder';
import { DayNight } from '../world/DayNight';
import { buildLandmarks } from '../world/Landmarks';
import { CAR_SPOTS, LANDMARKS, NPC_SPOTS, SPAWN, WORLD, districtAt, type NpcSpot } from '../world/MapData';
import { updateGlowMaterials, worldUniforms } from '../world/Materials';
import { Npcs } from '../world/Npc';
import { Traffic } from '../world/Traffic';
import { Customizer } from '../ui/Customizer';
import { Dialogue } from '../ui/Dialogue';
import { Hud } from '../ui/Hud';
import { Menus } from '../ui/Menus';
import { FullMap, MapImage, Minimap, npcMarkers, type MapMarker } from '../ui/Minimap';
import { TouchControls } from '../ui/TouchControls';
import { $, h, naira, show } from '../ui/dom';

type State = 'loading' | 'menu' | 'customize' | 'play' | 'paused' | 'dialogue' | 'map';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.5, 900);
  readonly world = new CollisionWorld();
  readonly input: Input;
  readonly audio = new Audio();
  readonly events = new EventSystem(EVENTS);
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
    this.world.bounds = { x0: WORLD.x0, z0: WORLD.z0, x1: WORLD.x1, z1: WORLD.z1 };
    progress(0.45, 'Painting Aso Rock and the National Mosque…');
    await nextFrame();
    const lm = buildLandmarks(this.world);
    this.scene.add(lm.group);
    this.glowMats.push(...lm.glowMats);
    this.animators.push(...lm.animators);
    progress(0.65, 'Calling One-Way drivers into position…');
    await nextFrame();
    this.dayNight = new DayNight(this.scene);
    this.traffic = new Traffic(TIERS.high.traffic);
    this.scene.add(this.traffic.mesh, this.traffic.taxiMesh);
    this.npcs = new Npcs(TIERS.high.walkers);
    this.scene.add(this.npcs.group);
    for (const s of NPC_SPOTS) this.world.addCircle(s.x, s.z, 0.4, 2);
    for (const c of CAR_SPOTS) {
      const v = new Vehicle(c.x, c.z, c.heading, c.color);
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
    this.hud = new Hud();
    this.hud.bindings = this.input.bindings;
    this.hud.device = this.input.device;
    const img = new MapImage(buildings);
    this.minimap = new Minimap(this.hud.minimapCanvas, img);
    const mapEl = $('map');
    const mapCanvas = h('canvas.fullmap') as HTMLCanvasElement;
    mapEl.append(
      h('div.map-head', {}, h('span', { text: 'ABUJA — FCT' }), h('button.btn.small', { type: 'button', onclick: () => this.closeMap() }, 'Close ✕')),
      mapCanvas,
      h('div.map-legend', { html: '<span class="dot y"></span> Talk to people &nbsp; <span class="dot b"></span> Cars &nbsp; <span class="dot h"></span> Your flat' }),
    );
    this.fullMap = new FullMap(mapCanvas, img);
    this.dialogue = new Dialogue();
    this.dialogue.onClick = () => this.audio.click();
    this.dialogue.keyLabel = (i) => (this.input.device === 'gamepad' ? ['↑', '←', '↓'][i] : String(i + 1));
    this.customizer = new Customizer();
    this.customizer.onClick = () => this.audio.click();
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
    });
    this.menus.setSettings(this.save.settings);
    this.input.onDeviceChange = (d) => {
      this.hud.device = d;
      this.refreshTouch();
    };
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
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
    this.customizer.open(this.save.character, 'new', (cfg) => {
      this.customizer.close();
      const settings = this.save.settings;
      this.save = newSave(cfg);
      this.save.settings = settings;
      this.save.stats = { ...STARTING_STATS[cfg.background] };
      this.flags = new Set();
      this.hour = 8.5;
      this.day = 1;
      this.playTime = 0;
      this.events.markFired('mummy', 0);
      this.playerChar.build(cfg);
      this.leaveCar(true);
      this.resetCars();
      this.player.teleport(SPAWN.x, SPAWN.z, SPAWN.heading);
      this.rig.snapBehind(SPAWN.heading);
      this.startPlay();
      this.hud.showToast('WELCOME TO ABUJA', `Oya ${cfg.name}, talk to Uncle Emeka (!) beside you`);
      this.persist();
    });
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
    this.startPlay();
    this.hud.showToast(`WELCOME BACK, ${this.save.character.name.toUpperCase()}`, 'Abuja missed you small.');
  }

  private startPlay(): void {
    this.state = 'play';
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
    }
    if (this.state === 'customize') {
      this.customizer.update(dt, window.innerWidth, window.innerHeight);
      this.renderer.render(this.customizer.scene, this.customizer.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.input.endFrame();
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
    this.world.dynamics = [...this.traffic.dynamics, ...this.npcs.dynamics, ...this.parkedDyn];
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
    this.playTime += dt;
    this.updateWorld(dt, true);
    const look = inp.look(dt);
    const move = inp.move();
    const analog = inp.device !== 'keyboard';
    let prompt: { action: 'interact' | 'vehicle'; text: string; touch: string } | null = null;

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
      this.rig.update(dt, look, new THREE.Vector3(this.player.x, 1.45 + this.player.y, this.player.z), this.world, {
        distance: 5.2,
        followHeading: analog && moving && move.y > 0.3 ? this.player.heading : undefined,
        followDelay: 0.8,
      });
      this.audio.engine(null);
      this.hud.setSpeed(null);
      const npc = this.nearestNpc(this.player.x, this.player.z, 2.8);
      const car = this.nearestCar(this.player.x, this.player.z, 3.8);
      if (npc) prompt = { action: 'interact', text: `Talk to ${npc.name}`, touch: 'Talk' };
      else if (car) prompt = { action: 'vehicle', text: 'Enter car', touch: 'Enter' };
      if (npc && inp.wasPressed('interact')) {
        this.talkTo(npc);
        return;
      }
      if (car && inp.wasPressed('vehicle')) this.enterCar(car);
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
    const id = d?.id ?? 'outskirts';
    if (id !== this.district) {
      const first = this.district === null;
      this.district = id;
      this.hud.setDistrict(d?.name ?? 'FCT Outskirts');
      if (!first || this.playTime > 1) {
        this.hud.showToast((d?.name ?? 'FCT Outskirts').toUpperCase(), d?.tagline ?? 'Bush road. Watch out for potholes.');
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
    this.touchUi.setContext(this.car !== null, prompt?.touch ?? null);
    this.minimapTimer -= dt;
    if (this.minimapTimer <= 0) {
      this.minimapTimer = 1 / 24;
      const radius = this.car ? 170 : 95;
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

  // ------------------------------------------------------------- vehicles
  private enterCar(car: Vehicle): void {
    this.car = car;
    car.occupied = true;
    this.playerChar.root.visible = false;
    this.audio.door();
    this.rig.snapBehind(car.heading);
    this.hud.notify('Pom pom! Press ' + this.hud.key('horn') + ' to horn', 'info');
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
    if (npc) npc.char.talking = true;
  }

  private startEvent(ev: GameEvent, spot: NpcSpot | null): void {
    this.events.markFired(ev.id, this.playTime);
    this.beginDialogue(spot);
    const ctx = this.eventCtx();
    this.dialogue.start({
      title: ev.title,
      speaker: ev.speaker,
      lines: linesFor(ev, this.save.character.background),
      choices: ev.choices.map((c) => ({ text: c.text, locked: meets(c.requires, ctx) ? undefined : c.lockedHint ?? 'Locked' })),
      onChoice: (i) => {
        const out = this.events.resolve(ev, i, this.eventCtx());
        if (!out) return { text: '…', tags: [] };
        return { text: out.text, tags: this.applyOutcome(out) };
      },
      onClose: () => this.endDialogue(),
    });
  }

  private applyOutcome(o: Outcome): { text: string; kind: 'good' | 'bad' | 'info' }[] {
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
    if (fx.flag) this.flags.add(fx.flag);
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
    if (npc) npc.char.talking = false;
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
      (['choice1', 'choice2', 'choice3'] as const).forEach((a, i) => {
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
