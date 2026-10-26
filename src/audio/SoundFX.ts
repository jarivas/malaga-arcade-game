import Phaser from 'phaser';

const MASTER_VOLUME = 0.22;
const NOISE_BUFFER_SECONDS = 0.3;

/**
 * Tiny procedural arcade sound synthesizer built on the AudioContext used by
 * Phaser. No external audio files are required.
 */
export class SoundFX {
  private readonly scene: Phaser.Scene;
  private readonly context: AudioContext;
  private readonly destination: AudioNode;
  private readonly masterGain: GainNode;
  private readonly ownsContext: boolean;
  private noiseBuffer?: AudioBuffer;

  private readonly unlock = (): void => {
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => undefined);
    }
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const manager = scene.sound as Phaser.Sound.WebAudioSoundManager;
    if (manager.context) {
      this.context = manager.context;
      this.destination = manager.destination ?? manager.context.destination;
      this.ownsContext = false;
    } else {
      this.context = new AudioContext();
      this.destination = this.context.destination;
      this.ownsContext = true;
    }

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = MASTER_VOLUME;
    this.masterGain.connect(this.destination);

    // Resume the context on the first mouse, keyboard or gamepad interaction.
    scene.input.on('pointerdown', this.unlock, this);
    scene.input.keyboard?.on('keydown', this.unlock, this);
    scene.input.gamepad?.on('down', this.unlock, this);

    this.unlock();
  }

  public playSlash(): void {
    if (!this.prepare()) {
      return;
    }

    const now = this.context.currentTime;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    gain.connect(this.masterGain);

    const saw = this.context.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(800, now);
    saw.frequency.exponentialRampToValueAtTime(150, now + 0.1);
    saw.connect(gain);
    saw.start(now);
    saw.stop(now + 0.11);

    const whistle = this.context.createOscillator();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(1600, now);
    whistle.frequency.exponentialRampToValueAtTime(300, now + 0.1);

    const whistleGain = this.context.createGain();
    whistleGain.gain.setValueAtTime(0.06, now);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    whistle.connect(whistleGain);
    whistleGain.connect(this.masterGain);
    whistle.start(now);
    whistle.stop(now + 0.11);
  }

  public playHit(): void {
    if (!this.prepare()) {
      return;
    }

    const now = this.context.currentTime;

    this.noiseBurst(now, 0.08, 0.16, 1600);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    gain.connect(this.masterGain);

    const body = this.context.createOscillator();
    body.type = 'square';
    body.frequency.setValueAtTime(120, now);
    body.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    body.connect(gain);
    body.start(now);
    body.stop(now + 0.09);
  }

  public playSpecial(): void {
    if (!this.prepare()) {
      return;
    }

    const now = this.context.currentTime;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    gain.connect(this.masterGain);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.3);
    filter.connect(gain);

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);
    osc.connect(filter);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playEnemyDeath(): void {
    if (!this.prepare()) {
      return;
    }

    const now = this.context.currentTime;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    gain.connect(this.masterGain);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.value = 0.8;
    filter.connect(gain);

    const shaper = this.context.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / (curve.length - 1) - 1;
      curve[i] = Math.tanh(3 * x);
    }
    shaper.curve = curve;
    shaper.oversample = '2x';
    shaper.connect(filter);

    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
    osc.connect(shaper);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Dull metal/wood burst for a destroyed bin or crate.
   */
  public playBreak(): void {
    if (!this.prepare()) {
      return;
    }

    const now = this.context.currentTime;

    this.noiseBurst(now, 0.16, 0.3, 900);
    this.noiseBurst(now + 0.02, 0.1, 0.16, 320);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    gain.connect(this.masterGain);

    const thud = this.context.createOscillator();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(150, now);
    thud.frequency.exponentialRampToValueAtTime(45, now + 0.2);
    thud.connect(gain);
    thud.start(now);
    thud.stop(now + 0.22);
  }

  /**
   * Short ascending arcade jingle when a pickup is collected.
   */
  public playPickup(): void {
    if (!this.prepare()) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(660, now, 0.07, 0.14);
    this.playTone(880, now + 0.07, 0.09, 0.14);
    this.playTone(1320, now + 0.16, 0.16, 0.12);
  }

  public playGo(): void {
    if (!this.prepare()) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(587, now, 0.1, 0.16);
    this.playTone(880, now + 0.1, 0.2, 0.16);
  }

  public playPlayerHurt(): void {
    if (!this.prepare()) {
      return;
    }

    const now = this.context.currentTime;

    this.noiseBurst(now, 0.05, 0.12, 700);

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    gain.connect(this.masterGain);

    const whine = this.context.createOscillator();
    whine.type = 'triangle';
    whine.frequency.setValueAtTime(180, now);
    whine.frequency.exponentialRampToValueAtTime(120, now + 0.18);
    whine.connect(gain);
    whine.start(now);
    whine.stop(now + 0.21);
  }

  public destroy(): void {
    this.scene.input.off('pointerdown', this.unlock, this);
    this.scene.input.keyboard?.off('keydown', this.unlock, this);
    this.scene.input.gamepad?.off('down', this.unlock, this);

    this.masterGain.disconnect();

    if (this.ownsContext && this.context.state !== 'closed') {
      void this.context.close().catch(() => undefined);
    }
  }

  private prepare(): boolean {
    if (this.context.state === 'closed') {
      return false;
    }

    this.unlock();
    return true;
  }

  private playTone(
    frequency: number,
    start: number,
    duration: number,
    level: number
  ): void {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    gain.connect(this.masterGain);

    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, start);
    osc.connect(gain);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  private noiseBurst(
    start: number,
    duration: number,
    level: number,
    filterFrequency: number
  ): void {
    const noise = this.context.createBufferSource();
    noise.buffer = this.getNoiseBuffer();

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(start);
    noise.stop(start + duration);
  }

  private getNoiseBuffer(): AudioBuffer {
    if (this.noiseBuffer) {
      return this.noiseBuffer;
    }

    const length = Math.max(
      1,
      Math.floor(this.context.sampleRate * NOISE_BUFFER_SECONDS)
    );
    const buffer = this.context.createBuffer(
      1,
      length,
      this.context.sampleRate
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }
}
