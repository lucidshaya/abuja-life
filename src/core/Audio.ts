import { Music } from './Music';

/** Tiny synthesized sound kit — no audio files to download. */
export class Audio {
  readonly music = new Music();
  private musicGain: GainNode | null = null;
  muted = false;
  musicVolume = 0.5;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  volume = 0.6;

  /** Must be called from a user gesture. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume * 0.6;
      this.musicGain.connect(this.master);
      this.music.attach(this.ctx, this.musicGain);
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = this.muted ? 0 : v;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v * 0.6;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slide = 0): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  horn(): void {
    // "Pom pom!" — two-tone car horn.
    for (const d of [0, 0.22]) {
      this.tone(415, 0.18, 'square', 0.12, d);
      this.tone(523, 0.18, 'square', 0.08, d);
    }
  }

  click(): void {
    this.tone(880, 0.05, 'triangle', 0.08);
  }

  coin(): void {
    this.tone(988, 0.08, 'square', 0.07);
    this.tone(1319, 0.18, 'square', 0.07, 0.07);
  }

  lose(): void {
    this.tone(220, 0.25, 'sawtooth', 0.06, 0, -80);
  }

  chime(): void {
    this.tone(659, 0.15, 'sine', 0.1);
    this.tone(880, 0.25, 'sine', 0.08, 0.1);
  }

  bump(strength: number): void {
    this.tone(90, 0.18, 'square', Math.min(0.2, 0.04 + strength * 0.01), 0, -40);
  }

  jump(): void {
    this.tone(330, 0.12, 'triangle', 0.05, 0, 200);
  }

  door(): void {
    this.tone(140, 0.08, 'square', 0.08);
    this.tone(110, 0.1, 'square', 0.06, 0.06);
  }

  /** Continuous engine hum; speed in m/s, null to stop. */
  engine(speed: number | null): void {
    if (!this.ctx || !this.master) return;
    if (speed === null) {
      if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 400;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
      this.engineOsc.start();
    }
    const s = Math.abs(speed);
    const gear = s % 9;
    this.engineOsc.frequency.setTargetAtTime(38 + gear * 7 + s * 1.6, this.ctx.currentTime, 0.05);
    this.engineFilter!.frequency.setTargetAtTime(300 + s * 25, this.ctx.currentTime, 0.1);
    this.engineGain!.gain.setTargetAtTime(0.05 + Math.min(0.05, s * 0.002), this.ctx.currentTime, 0.1);
  }
}
