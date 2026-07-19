/**
 * WebAudio-based sound: every effect and the background music are synthesized
 * at runtime — zero audio assets, zero licensing concerns.
 */
export class AudioManager {
  private ctx?: AudioContext;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  private masterGain?: GainNode;
  private musicTimer?: ReturnType<typeof setInterval>;
  private musicStep = 0;
  private waveTimer?: ReturnType<typeof setInterval>;

  musicEnabled = true;
  sfxEnabled = true;
  volume = 0.8;

  /** must be called from a user gesture on iOS/Safari */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicEnabled ? 0.16 : 0;
    this.musicGain.connect(this.masterGain);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxEnabled ? 1 : 0;
    this.sfxGain.connect(this.masterGain);
    this.startMusicLoop();
    this.startWaves();
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.masterGain) this.masterGain.gain.value = volume;
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (this.musicGain) this.musicGain.gain.value = enabled ? 0.16 : 0;
  }

  setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (this.sfxGain) this.sfxGain.gain.value = enabled ? 1 : 0;
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }

  private tone(
    freq: number,
    duration: number,
    options: { type?: OscillatorType; gain?: number; when?: number; slide?: number; target?: GainNode } = {}
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime + (options.when ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = options.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (options.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + options.slide), t0 + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(options.gain ?? 0.2, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(options.target ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  private noise(duration: number, gainValue: number, filterFreq: number, target?: GainNode): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    const t0 = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainValue, t0 + duration * 0.3);
    gain.gain.linearRampToValueAtTime(0, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(target ?? this.sfxGain ?? this.ctx.destination);
    src.start();
  }

  bell(): void {
    this.tone(880, 0.4, { type: 'triangle', gain: 0.3 });
    this.tone(1320, 0.5, { type: 'sine', gain: 0.15, when: 0.02 });
  }

  scoop(): void {
    this.tone(220, 0.12, { type: 'sine', gain: 0.25, slide: 160 });
  }

  plop(): void {
    this.tone(320, 0.14, { type: 'sine', gain: 0.3, slide: -180 });
  }

  sauce(): void {
    this.noise(0.25, 0.12, 900);
  }

  coins(): void {
    this.tone(1200, 0.08, { type: 'square', gain: 0.08 });
    this.tone(1600, 0.1, { type: 'square', gain: 0.08, when: 0.07 });
    this.tone(2000, 0.14, { type: 'square', gain: 0.08, when: 0.14 });
  }

  error(): void {
    this.tone(220, 0.2, { type: 'sawtooth', gain: 0.12 });
    this.tone(165, 0.3, { type: 'sawtooth', gain: 0.12, when: 0.12 });
  }

  success(): void {
    this.tone(523, 0.12, { gain: 0.18 });
    this.tone(659, 0.12, { gain: 0.18, when: 0.1 });
    this.tone(784, 0.22, { gain: 0.18, when: 0.2 });
  }

  angry(): void {
    this.tone(140, 0.3, { type: 'sawtooth', gain: 0.15, slide: -60 });
  }

  click(): void {
    this.tone(600, 0.05, { type: 'triangle', gain: 0.1 });
  }

  /** gentle looping beach waves */
  private startWaves(): void {
    if (!this.ctx || this.waveTimer) return;
    const play = () => this.noise(2.4, 0.045, 500, this.musicGain);
    play();
    this.waveTimer = setInterval(play, 2600);
  }

  /** simple cheerful chiptune loop */
  private startMusicLoop(): void {
    if (!this.ctx || this.musicTimer) return;
    // C major pentatonic-ish cartoon melody
    const melody = [523, 587, 659, 784, 659, 587, 523, 392, 440, 523, 587, 523, 440, 392, 330, 392];
    const bass = [131, 131, 165, 165, 196, 196, 165, 165];
    const stepDur = 0.28;
    this.musicTimer = setInterval(() => {
      if (!this.musicEnabled) return;
      const i = this.musicStep % melody.length;
      this.tone(melody[i], stepDur * 0.9, { type: 'triangle', gain: 0.5, target: this.musicGain });
      if (this.musicStep % 2 === 0) {
        this.tone(bass[(this.musicStep / 2) % bass.length], stepDur * 1.6, { type: 'sine', gain: 0.6, target: this.musicGain });
      }
      this.musicStep++;
    }, stepDur * 1000);
  }

  dispose(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (this.waveTimer) clearInterval(this.waveTimer);
    void this.ctx?.close();
    this.ctx = undefined;
  }
}
