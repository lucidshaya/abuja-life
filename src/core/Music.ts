/**
 * Original background music, synthesized live with WebAudio — no files, no
 * licensing. "city" is a mid-tempo Afrobeats groove with highlife guitar and a
 * talking-drum fill; "club" is an amapiano groove with log drums.
 *
 * If a file exists at music/theme.m4a|mp3 (or music/club.m4a|mp3) next to the page,
 * it is used instead, so you can drop in a track you have the rights to.
 */

export type MusicMode = 'city' | 'club' | 'off';

// Note helpers (A minor / C major family).
const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (name: string, octave: number) => 440 * Math.pow(2, (NOTE[name] + (octave - 4) * 12 - 9) / 12);

interface Chord {
  root: [string, number];
  tones: [string, number][];
}

const CITY_CHORDS: Chord[] = [
  { root: ['A', 1], tones: [['A', 3], ['C', 4], ['E', 4], ['G', 4]] },
  { root: ['D', 2], tones: [['D', 4], ['F', 4], ['A', 4], ['C', 5]] },
  { root: ['G', 1], tones: [['G', 3], ['B', 3], ['D', 4], ['F', 4]] },
  { root: ['C', 2], tones: [['C', 4], ['E', 4], ['G', 4], ['B', 4]] },
];

const CLUB_CHORDS: Chord[] = [
  { root: ['A', 1], tones: [['A', 3], ['C', 4], ['E', 4]] },
  { root: ['F', 1], tones: [['F', 3], ['A', 3], ['C', 4]] },
  { root: ['C', 2], tones: [['C', 4], ['E', 4], ['G', 4]] },
  { root: ['G', 1], tones: [['G', 3], ['B', 3], ['D', 4]] },
];

const hit = (pattern: string, step: number) => pattern[step] === 'x';

// 16 steps per bar.
const CITY = {
  bpm: 106,
  kick: 'x.....x.x.....x.',
  clap: '....x.....x.x...',
  shaker: 'xxxxxxxxxxxxxxxx',
  conga: '...x...x..x.x..x',
  bass: [0, 3, 6, 10, 12] as number[],
  guitar: [2, 5, 7, 10, 13, 15] as number[],
};

const CLUB = {
  bpm: 113,
  kick: 'x...x...x...x...',
  clap: '....x.......x...',
  shaker: 'x.xxx.xxx.xxx.xx',
  log: [0, 3, 7, 10, 14] as number[],
  stab: [2, 6, 11] as number[],
};

export class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer = 0;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  mode: MusicMode = 'off';
  private file: Partial<Record<'city' | 'club', HTMLAudioElement>> = {};
  private fileNode: MediaElementAudioSourceNode[] = [];
  private probed = false;
  /** A track the player picked from their own device (plays in every mode). */
  private userTrack: HTMLAudioElement | null = null;
  private userNode: MediaElementAudioSourceNode | null = null;
  userTrackName: string | null = null;

  get hasThemeFile(): boolean {
    return !!this.file.city;
  }

  attach(ctx: AudioContext, out: GainNode): void {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = out;
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    void this.probeFiles();
    if (this.mode !== 'off') this.start(this.mode);
  }

  /** Look for optional user-supplied tracks next to the page. */
  private async probeFiles(): Promise<void> {
    if (this.probed || !this.ctx || !this.out) return;
    this.probed = true;
    const candidates: Record<'city' | 'club', string[]> = {
      city: ['music/theme.mp3', 'music/theme.m4a'],
      club: ['music/club.mp3', 'music/club.m4a'],
    };
    for (const m of ['city', 'club'] as const) {
      let url: string | null = null;
      for (const u of candidates[m]) {
        try {
          const r = await fetch(u, { method: 'HEAD' });
          const type = r.headers.get('content-type') ?? '';
          if (r.ok && !type.includes('html')) {
            url = u;
            break;
          }
        } catch {
          /* try the next one */
        }
      }
      if (!url) continue;
      try {
        const el = new window.Audio(url);
        el.loop = true;
        el.crossOrigin = 'anonymous';
        const node = this.ctx.createMediaElementSource(el);
        node.connect(this.out);
        this.fileNode.push(node);
        this.file[m] = el;
      } catch {
        /* no custom track: use the synth */
      }
    }
    if (this.mode !== 'off') this.start(this.mode);
  }

  /** Use a song file from the player's device as the soundtrack (null = back to the built-in music). */
  setUserTrack(file: Blob | null, name: string | null): void {
    if (this.userTrack) {
      this.userTrack.pause();
      URL.revokeObjectURL(this.userTrack.src);
      this.userNode?.disconnect();
    }
    this.userTrack = null;
    this.userNode = null;
    this.userTrackName = null;
    if (file) {
      const el = new window.Audio(URL.createObjectURL(file));
      el.loop = true;
      this.userTrack = el;
      this.userTrackName = name;
      if (this.ctx && this.out) {
        this.userNode = this.ctx.createMediaElementSource(el);
        this.userNode.connect(this.out);
      }
    }
    const m = this.mode;
    this.mode = 'off';
    this.start(m);
  }

  setMode(mode: MusicMode): void {
    if (mode === this.mode) return;
    this.start(mode);
  }

  private start(mode: MusicMode): void {
    this.mode = mode;
    window.clearInterval(this.timer);
    this.timer = 0;
    for (const el of Object.values(this.file)) el?.pause();
    if (mode === 'off') this.userTrack?.pause();
    if (!this.ctx || mode === 'off') return;
    if (this.userTrack) {
      if (!this.userNode && this.out) {
        this.userNode = this.ctx.createMediaElementSource(this.userTrack);
        this.userNode.connect(this.out);
      }
      void this.userTrack.play().catch(() => {});
      return;
    }
    // The shipped theme plays everywhere unless a separate club track exists.
    const custom = this.file[mode] ?? this.file.city;
    if (custom) {
      void custom.play().catch(() => {});
      return;
    }
    this.step = 0;
    this.bar = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const bpm = this.mode === 'club' ? CLUB.bpm : CITY.bpm;
    const stepDur = 60 / bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.15) {
      // Slight swing on off-16ths for that Afro bounce.
      const swing = this.step % 2 === 1 ? stepDur * 0.12 : 0;
      if (this.mode === 'club') this.clubStep(this.nextTime + swing, stepDur);
      else this.cityStep(this.nextTime + swing, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar++;
    }
  }

  // ---------------- Grooves ----------------
  private cityStep(t: number, sd: number): void {
    const s = this.step;
    const chord = CITY_CHORDS[this.bar % 4];
    const intro = this.bar < 2;
    if (hit(CITY.kick, s) && !intro) this.kick(t, 0.9);
    if (hit(CITY.clap, s) && !intro) this.clap(t, s === 10 ? 0.25 : 0.5);
    if (hit(CITY.shaker, s)) this.shaker(t, s % 4 === 2 ? 0.16 : s % 2 ? 0.09 : 0.05);
    if (hit(CITY.conga, s) && this.bar > 0) this.conga(t, s % 8 === 3 ? 260 : 190, 0.35);
    if (CITY.bass.includes(s) && !intro) {
      const [n, o] = chord.root;
      const up = s === 6 || s === 12 ? 7 : 0; // fifth on the syncopated hits
      this.bass(t, freq(n, o) * Math.pow(2, up / 12), sd * (s === 12 ? 3 : 2));
    }
    if (CITY.guitar.includes(s)) {
      const idx = CITY.guitar.indexOf(s);
      const [n, o] = chord.tones[(idx + this.bar) % chord.tones.length];
      this.pluck(t, freq(n, o + 1), 0.11);
    }
    if (s === 0) this.pad(t, chord, sd * 16, 0.05);
    // Talking drum fill every 8 bars.
    if (this.bar % 8 === 7 && s >= 12) this.talkingDrum(t, s);
  }

  private clubStep(t: number, sd: number): void {
    const s = this.step;
    const chord = CLUB_CHORDS[this.bar % 4];
    if (hit(CLUB.kick, s)) this.kick(t, 0.75);
    if (hit(CLUB.clap, s)) this.clap(t, 0.45);
    if (hit(CLUB.shaker, s)) this.shaker(t, s % 4 === 2 ? 0.17 : 0.07);
    if (CLUB.log.includes(s)) {
      const [n, o] = chord.root;
      const k = CLUB.log.indexOf(s);
      const semis = [0, 0, 7, 12, 3][k];
      this.logDrum(t, freq(n, o + 1) * Math.pow(2, semis / 12), sd * 2.5);
    }
    if (CLUB.stab.includes(s)) for (const [n, o] of chord.tones) this.pluck(t, freq(n, o + 1), 0.05, 'square', 0.25);
    if (s === 0) this.pad(t, chord, sd * 16, 0.04);
  }

  // ---------------- Instruments ----------------
  private env(t: number, peak: number, attack: number, decay: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.out!);
    return g;
  }

  private kick(t: number, v: number): void {
    const o = this.ctx!.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    o.connect(this.env(t, v, 0.003, 0.32));
    o.start(t);
    o.stop(t + 0.4);
  }

  private noiseHit(t: number, v: number, type: BiquadFilterType, f: number, q: number, decay: number): void {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    const flt = this.ctx!.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    src.connect(flt).connect(this.env(t, v, 0.002, decay));
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.05);
  }

  private clap(t: number, v: number): void {
    this.noiseHit(t, v, 'bandpass', 1700, 1.2, 0.16);
    this.noiseHit(t + 0.012, v * 0.6, 'bandpass', 2200, 1.5, 0.1);
  }

  private shaker(t: number, v: number): void {
    this.noiseHit(t, v, 'highpass', 7000, 0.7, 0.05);
  }

  private conga(t: number, f: number, v: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.3, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    o.connect(this.env(t, v, 0.002, 0.18));
    o.start(t);
    o.stop(t + 0.25);
  }

  private talkingDrum(t: number, s: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'sine';
    const base = s % 2 ? 180 : 140;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * (s % 2 ? 1.5 : 0.7), t + 0.12);
    o.connect(this.env(t, 0.4, 0.004, 0.2));
    o.start(t);
    o.stop(t + 0.28);
  }

  private bass(t: number, f: number, dur: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const flt = this.ctx!.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 420;
    o.connect(flt).connect(this.env(t, 0.42, 0.01, dur));
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private logDrum(t: number, f: number, dur: number): void {
    // Amapiano log drum: woody sine with a quick downward pitch bend.
    const o = this.ctx!.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const o2 = this.ctx!.createOscillator();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(f * 2, t);
    const g2 = this.env(t, 0.08, 0.002, 0.08);
    o2.connect(g2);
    o.connect(this.env(t, 0.55, 0.004, dur));
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + 0.15);
  }

  private pluck(t: number, f: number, v: number, type: OscillatorType = 'triangle', decay = 0.35): void {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const flt = this.ctx!.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(3200, t);
    flt.frequency.exponentialRampToValueAtTime(700, t + decay);
    o.connect(flt).connect(this.env(t, v, 0.003, decay));
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  private pad(t: number, chord: Chord, dur: number, v: number): void {
    const flt = this.ctx!.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 900;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + dur * 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    flt.connect(g).connect(this.out!);
    for (const [n, o] of chord.tones) {
      for (const det of [-6, 6]) {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq(n, o);
        osc.detune.value = det;
        osc.connect(flt);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      }
    }
  }
}
