import { ACTION_LABELS, DEFAULT_BINDINGS, REBINDABLE, keyLabel, rebind, type Bindings, type Input } from '../core/Input';
import type { QualitySetting, Settings } from '../core/Save';
import { $, h, show } from './dom';

export interface MenuCallbacks {
  onContinue: () => void;
  onNewGame: () => void;
  onResume: () => void;
  onQuit: () => void;
  onSettingsChanged: (s: Settings) => void;
  onClick: () => void;
  onTravel: () => void;
  onPickTrack: (file: File) => void;
  onClearTrack: () => void;
}

/** Main menu, pause menu, settings (with key remapping) and controls help. */
export class Menus {
  private main = $('menu');
  private pause = $('pause');
  private settingsEl = $('settings');
  private help = $('help');
  private continueBtn: HTMLButtonElement;
  private back: 'menu' | 'pause' = 'menu';
  private settings!: Settings;
  private trackName: string | null = null;

  constructor(private input: Input, private cb: MenuCallbacks) {
    const btn = (label: string, fn: () => void, cls = '') =>
      h('button.btn' + (cls ? '.' + cls : ''), { type: 'button', onclick: () => { this.cb.onClick(); fn(); } }, label) as HTMLButtonElement;

    this.continueBtn = btn('Continue', () => cb.onContinue(), 'primary');
    this.main.append(
      h('div.menu-card', {},
        h('div.logo', {}, h('span.l1', { text: 'ABUJA' }), h('span.l2', { text: 'LIFE' })),
        h('div.tagline', { text: 'Centre of Unity. Centre of Wahala.' }),
        h('div.menu-buttons', {},
          this.continueBtn,
          btn('New Life', () => cb.onNewGame(), 'primary'),
          btn('Settings', () => this.openSettings('menu')),
          btn('Controls', () => this.openHelp('menu')),
        ),
        h('div.menu-foot', { html: 'Explore Wuse 2, Maitama, Garki, Jabi, Gwarinpa &amp; Kubwa · Works on PC, gamepad &amp; phone' }),
      ),
    );
    this.pause.append(
      h('div.menu-card.small', {},
        h('div.p-title', { text: 'Paused' }),
        h('div.menu-buttons', {},
          btn('Resume', () => cb.onResume(), 'primary'),
          btn('Fast Travel', () => cb.onTravel()),
          btn('Settings', () => this.openSettings('pause')),
          btn('Controls', () => this.openHelp('pause')),
          btn('Save & Quit to Menu', () => cb.onQuit()),
        ),
      ),
    );
  }

  showMain(hasSave: boolean): void {
    show(this.continueBtn, hasSave);
    show(this.main, true);
    show(this.pause, false);
    show(this.settingsEl, false);
    show(this.help, false);
  }

  hideAll(): void {
    for (const el of [this.main, this.pause, this.settingsEl, this.help]) show(el, false);
  }

  showPause(): void {
    this.hideAll();
    show(this.pause, true);
  }

  get anyOpen(): boolean {
    return [this.main, this.pause, this.settingsEl, this.help].some((e) => !e.classList.contains('hidden'));
  }

  /** Esc inside sub-screens goes back. Returns true if handled. */
  backOut(): boolean {
    if (!this.settingsEl.classList.contains('hidden') || !this.help.classList.contains('hidden')) {
      this.goBack();
      return true;
    }
    return false;
  }

  setSettings(s: Settings): void {
    this.settings = s;
  }

  setTrackName(name: string | null): void {
    this.trackName = name;
    const el = document.getElementById('track-name');
    if (el) el.textContent = name ?? 'Built-in Abuja beats';
  }

  private goBack(): void {
    show(this.settingsEl, false);
    show(this.help, false);
    if (this.back === 'menu') show(this.main, true);
    else show(this.pause, true);
  }

  openSettingsFrom(from: 'menu' | 'pause'): void {
    this.openSettings(from);
  }

  private openSettings(from: 'menu' | 'pause'): void {
    this.back = from;
    this.hideAll();
    this.renderSettings();
    show(this.settingsEl, true);
  }

  private renderSettings(): void {
    const s = this.settings;
    const el = this.settingsEl;
    el.innerHTML = '';
    const changed = () => this.cb.onSettingsChanged(this.settings);
    const seg = (opts: [QualitySetting, string][]) =>
      h('div.seg', {}, ...opts.map(([v, label]) =>
        h('button' + (s.quality === v ? '.on' : ''), {
          type: 'button',
          onclick: () => {
            this.cb.onClick();
            this.settings.quality = v;
            changed();
            this.renderSettings();
          },
        }, label)));
    const slider = (min: number, max: number, step: number, value: number, onInput: (v: number) => void) => {
      const i = h('input', { type: 'range', min, max, step, value }) as HTMLInputElement;
      i.addEventListener('input', () => {
        onInput(parseFloat(i.value));
        changed();
      });
      return i;
    };
    const toggle = (value: boolean, onChange: (v: boolean) => void) => {
      const b = h('button.toggle' + (value ? '.on' : ''), { type: 'button' }, value ? 'On' : 'Off') as HTMLButtonElement;
      b.addEventListener('click', () => {
        this.cb.onClick();
        const v = !b.classList.contains('on');
        b.classList.toggle('on', v);
        b.textContent = v ? 'On' : 'Off';
        onChange(v);
        changed();
      });
      return b;
    };
    const row = (label: string, ctrl: HTMLElement) => h('div.set-row', {}, h('label', { text: label }), ctrl);

    const bindingsList = h('div.binds');
    const renderBinds = () => {
      bindingsList.innerHTML = '';
      const b = { ...DEFAULT_BINDINGS, ...this.settings.bindings } as Bindings;
      for (const a of REBINDABLE) {
        const keyBtn = h('button.keybtn', { type: 'button' }, b[a].map(keyLabel).join(' / ')) as HTMLButtonElement;
        keyBtn.addEventListener('click', () => {
          keyBtn.textContent = 'Press a key… (Esc to cancel)';
          keyBtn.classList.add('listening');
          this.input.captureNextKey((code) => {
            if (code) {
              const next = rebind(b, a, code);
              this.settings.bindings = next;
              changed();
            }
            renderBinds();
          });
        });
        bindingsList.append(h('div.bind-row', {}, h('span', { text: ACTION_LABELS[a] }), keyBtn));
      }
    };
    renderBinds();

    el.append(
      h('div.menu-card.wide', {},
        h('div.p-title', { text: 'Settings' }),
        h('div.set-scroll', {},
          h('div.set-section', { text: 'Graphics' }),
          row('Quality', seg([['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])),
          h('div.set-section', { text: 'Controls' }),
          row('Look sensitivity', slider(0.2, 3, 0.05, s.sensitivity, (v) => (this.settings.sensitivity = v))),
          row('Invert look Y', toggle(s.invertY, (v) => (this.settings.invertY = v))),
          row('On-screen key hints', toggle(s.showHints, (v) => (this.settings.showHints = v))),
          h('div.set-section', { text: 'Audio' }),
          row('Volume', slider(0, 1, 0.05, s.volume, (v) => (this.settings.volume = v))),
          row('Music volume', slider(0, 1, 0.05, s.musicVolume, (v) => (this.settings.musicVolume = v))),
          row('Mute everything (N)', toggle(s.muted, (v) => (this.settings.muted = v))),
          this.trackRow(),
          h('div.set-section', { text: 'Keyboard (click to remap)' }),
          bindingsList,
          h('button.btn.small', {
            type: 'button',
            onclick: () => {
              this.cb.onClick();
              this.settings.bindings = {};
              changed();
              renderBinds();
            },
          }, 'Reset keys to default'),
        ),
        h('button.btn.primary', { type: 'button', onclick: () => { this.cb.onClick(); this.goBack(); } }, 'Back'),
      ),
    );
  }

  /** "Your music": play a song from the player's own device as the soundtrack. */
  private trackRow(): HTMLElement {
    const input = h('input', { type: 'file', accept: 'audio/*,.mp3,.m4a,.aac,.wav,.ogg', id: 'track-file', class: 'hidden' }) as HTMLInputElement;
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (f) this.cb.onPickTrack(f);
      input.value = '';
    });
    const pickBtn = h('button.btn.small', { type: 'button', onclick: () => { this.cb.onClick(); input.click(); } }, 'Choose song…');
    const resetBtn = h('button.btn.small', { type: 'button', onclick: () => { this.cb.onClick(); this.cb.onClearTrack(); } }, 'Use built-in');
    return h('div.set-row.track', {},
      h('div', {}, h('label', { text: 'Your music' }), h('div.track-name', { id: 'track-name', text: this.trackName ?? 'Built-in Abuja beats' }), h('div.track-hint', { text: 'Pick a song from your phone or PC. It plays on this device only.' })),
      h('div.track-btns', {}, pickBtn, resetBtn, input),
    );
  }

  private openHelp(from: 'menu' | 'pause'): void {
    this.back = from;
    this.hideAll();
    const b = { ...DEFAULT_BINDINGS, ...this.settings.bindings } as Bindings;
    const k = (a: keyof Bindings) => b[a].map(keyLabel).join(' / ');
    const list = (rows: [string, string][]) => h('table', {}, ...rows.map(([key, what]) => h('tr', {}, h('td', {}, h('kbd', { text: key })), h('td', { text: what }))));
    this.help.innerHTML = '';
    this.help.append(
      h('div.menu-card.wide', {},
        h('div.p-title', { text: 'Controls' }),
        h('div.help-grid', {},
          h('div', {}, h('h3', { text: '⌨️ PC — on foot' }), list([
            [`${k('forward')}, ${k('left')}, ${k('back')}, ${k('right')}`, 'Move'],
            ['Mouse', 'Look around (click game to lock mouse)'],
            [k('sprint'), 'Run'], [k('jump'), 'Jump'], [k('interact'), 'Talk / interact'],
            [k('vehicle'), 'Enter / exit car'], [k('map'), 'City map'], [k('camera'), 'Reset camera'], ['Esc / P / Tab', 'Pause'],
            ['1 2 3', 'Pick dialogue choice'],
          ])),
          h('div', {}, h('h3', { text: '🚗 PC — driving' }), list([
            [`${k('forward')} / ${k('back')}`, 'Accelerate / brake & reverse'],
            [`${k('left')} / ${k('right')}`, 'Steer'], [k('jump'), 'Handbrake (drift!)'], [k('sprint'), 'Nitro'], [k('horn'), 'Horn — pom pom!'],
          ])),
          h('div', {}, h('h3', { text: '🎮 Gamepad' }), list([
            ['L stick', 'Move / steer'], ['R stick', 'Look'], ['RT / LT', 'Accelerate / brake'], ['A', 'Jump / handbrake'], ['B', 'Run / nitro'],
            ['X', 'Talk'], ['Y', 'Car'], ['RB', 'Horn'], ['D-pad', 'Dialogue choices'], ['Start', 'Pause'], ['View', 'Map'],
          ])),
          h('div', {}, h('h3', { text: '📱 Phone' }), list([
            ['Left thumb', 'Drag anywhere on the left to move (push far to run)'],
            ['Right thumb', 'Drag to look around'], ['Buttons', 'Jump, Run, Talk, Car, Horn'], ['Map / II', 'City map / pause'],
            ['Tip', 'Play in landscape for the best view'],
          ])),
        ),
        h('button.btn.primary', { type: 'button', onclick: () => { this.cb.onClick(); this.goBack(); } }, 'Back'),
      ),
    );
    show(this.help, true);
  }
}
