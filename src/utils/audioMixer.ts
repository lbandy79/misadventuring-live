/**
 * Awesome Mix Audio System
 * 
 * Professional audio management for TMP Live using Howler.js.
 * Handles theme-aware sounds, audio sprites, ambient loops,
 * crossfades, and fallback to synthesized sounds when no files exist.
 * 
 * "I'm gonna make some weird shit." - Star-Lord, probably
 */

import { Howl, Howler } from 'howler';
import type { ThemeId, ThemeSounds } from '../themes/theme.types';

// =============================================================================
// TYPES
// =============================================================================

export type SoundKey = keyof ThemeSounds | 'diceRoll' | 'diceImpact' | 'battleMusic' | 'countdown' | 'whoosh';

export interface AudioSpriteDefinition {
  [key: string]: [number, number]; // [start_ms, duration_ms]
}

export interface ThemeAudioPack {
  /** Path to the audio sprite file (or null to use synth fallback) */
  spriteUrl: string | null;
  /** Sprite timing definitions */
  sprites: AudioSpriteDefinition;
  /** Separate ambient loop file */
  ambientUrl: string | null;
  /** Battle music file */
  battleMusicUrl: string | null;
}

export interface AudioMixerConfig {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;
}

// =============================================================================
// SYNTH SOUNDS (Fallback when no audio files)
// =============================================================================

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Web Audio API fallback sounds - no files needed!
 * These are enhanced versions of the original sounds.ts
 */
const SynthSounds = {
  votecast: (volume: number) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    // Layered "satisfying pop" sound
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(600, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.05);
    osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);
    
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1200, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc1.connect(gain);
    osc2.connect(gain);
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.15);
  },

  timerTick: (volume: number) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 880;
    
    gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
    
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  },

  timerEnd: (volume: number) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    // Dramatic "time's up" buzzer
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 220;
    
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
    gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    
    osc.connect(gain);
    lfo.start(ctx.currentTime);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    lfo.stop(ctx.currentTime + 0.6);
  },

  victory: (volume: number) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    // Triumphant ascending arpeggio (C major fanfare)
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const noteGain = ctx.createGain();
      noteGain.connect(gain);
      noteGain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      noteGain.gain.linearRampToValueAtTime(volume * 0.35, ctx.currentTime + i * 0.1 + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.4);
      
      osc.connect(noteGain);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.4);
    });
  },

  error: (volume: number) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 120;
    
    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  },

  uiClick: (volume: number) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    
    gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
    
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
  },

  whoosh: (volume: number) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    // Noise-based swoosh
    const noise = ctx.createBufferSource();
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.15);
    filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.35);
    filter.Q.value = 0.7;
    
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    noise.connect(filter);
    filter.connect(gain);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.35);
  },

  diceRoll: (volume: number) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    // Dice rattle - multiple short clicks in sequence
    for (let i = 0; i < 8; i++) {
      const delay = i * 0.05 + Math.random() * 0.03;
      const clickGain = ctx.createGain();
      clickGain.connect(gain);
      
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 800 + Math.random() * 600;
      
      clickGain.gain.setValueAtTime(volume * 0.15, ctx.currentTime + delay);
      clickGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.02);
      
      osc.connect(clickGain);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.02);
    }
  },

  diceImpact: (volume: number) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    // Heavy impact thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
    
    // Add noise burst
    const noise = ctx.createBufferSource();
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    
    const noiseGain = ctx.createGain();
    noiseGain.connect(gain);
    noiseGain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    noise.connect(noiseGain);
    osc.start(ctx.currentTime);
    noise.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    noise.stop(ctx.currentTime + 0.05);
  },

  countdown: (volume: number, pitch: 'low' | 'high' = 'low') => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;
    
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    const freq = pitch === 'high' ? 880 : 440;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  },
};

// =============================================================================
// THEME AUDIO PACKS (Define where audio files would live)
// =============================================================================

/**
 * Audio pack definitions per theme.
 * Currently set to null (uses synth fallback).
 * When you add audio files, update these paths!
 * 
 * Recommended structure:
 *   /public/audio/soggy-bottom-pirates/sfx-sprite.webm
 *   /public/audio/soggy-bottom-pirates/ambient.webm
 *   /public/audio/soggy-bottom-pirates/battle.webm
 */
const ThemeAudioPacks: Record<ThemeId, ThemeAudioPack> = {
  'tmp-base': {
    spriteUrl: null, // '/audio/tmp-base/sfx-sprite.webm'
    sprites: {
      votecast: [0, 200],
      timerTick: [200, 100],
      timerEnd: [300, 600],
      victory: [900, 800],
      error: [1700, 300],
      uiClick: [2000, 100],
      whoosh: [2100, 350],
      diceRoll: [2450, 500],
      diceImpact: [2950, 200],
    },
    ambientUrl: null,
    battleMusicUrl: null,
  },
  'soggy-bottom-pirates': {
    spriteUrl: null, // '/audio/soggy-bottom-pirates/sfx-sprite.webm'
    sprites: {
      votecast: [0, 300],      // Splash/clank sound
      timerTick: [300, 150],   // Ship bell
      timerEnd: [450, 800],    // Cannon fire
      victory: [1250, 1200],   // Sea shanty victory sting
      error: [2450, 400],      // Wooden thunk
      uiClick: [2850, 100],    // Coin clink
      whoosh: [2950, 400],     // Sail whoosh
      diceRoll: [3350, 600],   // Dice on wooden table
      diceImpact: [3950, 300], // Heavy dice land
    },
    ambientUrl: null,   // '/audio/soggy-bottom-pirates/ocean-ambient.webm'
    battleMusicUrl: null, // '/audio/soggy-bottom-pirates/battle-shanty.webm'
  },
  'neon-nightmares': {
    spriteUrl: null, // '/audio/neon-nightmares/sfx-sprite.webm'
    sprites: {
      votecast: [0, 250],      // Synth blip
      timerTick: [250, 100],   // Electronic click
      timerEnd: [350, 700],    // Alarm/distortion
      victory: [1050, 1000],   // 80s power chord sting
      error: [2050, 400],      // Static burst
      uiClick: [2450, 80],     // Retro beep
      whoosh: [2530, 350],     // Digital swoosh
      diceRoll: [2880, 500],   // Electronic dice
      diceImpact: [3380, 250], // Bass drop impact
    },
    ambientUrl: null,   // '/audio/neon-nightmares/synth-drone.webm'
    battleMusicUrl: null, // '/audio/neon-nightmares/chase-synth.webm'
  },
};

// =============================================================================
// AUDIO MIXER CLASS
// =============================================================================

class AudioMixer {
  private config: AudioMixerConfig = {
    masterVolume: 0.8,
    sfxVolume: 0.7,
    musicVolume: 0.5,
    ambientVolume: 0.3,
  };

  private currentTheme: ThemeId = 'tmp-base';
  private sfxSprite: Howl | null = null;
  private ambientLoop: Howl | null = null;
  private battleMusic: Howl | null = null;
  private isInitialized = false;
  private isMuted = false;

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize audio system (call on user interaction to unlock audio)
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Resume Web Audio context (for synth fallback)
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Set Howler global volume
    Howler.volume(this.config.masterVolume);

    this.isInitialized = true;
    console.log('🎵 Awesome Mix Audio System initialized');
  }

  /**
   * Load audio assets for a specific theme
   */
  async loadTheme(themeId: ThemeId): Promise<void> {
    if (this.currentTheme === themeId && this.sfxSprite) {
      return; // Already loaded
    }

    // Unload previous theme audio
    this.unloadCurrentTheme();

    this.currentTheme = themeId;
    const pack = ThemeAudioPacks[themeId];

    // Load SFX sprite if URL exists
    if (pack.spriteUrl) {
      this.sfxSprite = new Howl({
        src: [pack.spriteUrl],
        sprite: pack.sprites as unknown as { [key: string]: [number, number] | [number, number, boolean] },
        preload: true,
        onloaderror: (id, err) => {
          console.warn(`Failed to load SFX sprite for ${themeId}:`, err);
          this.sfxSprite = null;
        },
      });
    }

    // Load ambient loop if URL exists
    if (pack.ambientUrl) {
      this.ambientLoop = new Howl({
        src: [pack.ambientUrl],
        loop: true,
        volume: this.config.ambientVolume * this.config.masterVolume,
        preload: true,
      });
    }

    // Load battle music if URL exists
    if (pack.battleMusicUrl) {
      this.battleMusic = new Howl({
        src: [pack.battleMusicUrl],
        loop: true,
        volume: 0, // Start at 0 for fade-in
        preload: true,
      });
    }

    console.log(`🎵 Loaded audio pack for theme: ${themeId}`);
  }

  private unloadCurrentTheme(): void {
    if (this.sfxSprite) {
      this.sfxSprite.unload();
      this.sfxSprite = null;
    }
    if (this.ambientLoop) {
      this.ambientLoop.stop();
      this.ambientLoop.unload();
      this.ambientLoop = null;
    }
    if (this.battleMusic) {
      this.battleMusic.stop();
      this.battleMusic.unload();
      this.battleMusic = null;
    }
  }

  // ==========================================================================
  // PLAYBACK
  // ==========================================================================

  /**
   * Play a sound effect (uses loaded sprite or synth fallback)
   */
  play(sound: SoundKey, options?: { volume?: number; rate?: number }): void {
    if (!this.isInitialized || this.isMuted) return;

    const volume = (options?.volume ?? 1) * this.config.sfxVolume * this.config.masterVolume;

    // Try Howler sprite first
    if (this.sfxSprite) {
      const pack = ThemeAudioPacks[this.currentTheme];
      if (sound in pack.sprites) {
        const id = this.sfxSprite.play(sound);
        this.sfxSprite.volume(volume, id);
        if (options?.rate) {
          this.sfxSprite.rate(options.rate, id);
        }
        return;
      }
    }

    // Fallback to synth
    this.playSynth(sound, volume);
  }

  private playSynth(sound: SoundKey, volume: number): void {
    switch (sound) {
      case 'votecast':
        SynthSounds.votecast(volume);
        break;
      case 'timerTick':
        SynthSounds.timerTick(volume);
        break;
      case 'timerEnd':
        SynthSounds.timerEnd(volume);
        break;
      case 'victory':
        SynthSounds.victory(volume);
        break;
      case 'error':
        SynthSounds.error(volume);
        break;
      case 'uiClick':
        SynthSounds.uiClick(volume);
        break;
      case 'whoosh':
        SynthSounds.whoosh(volume);
        break;
      case 'diceRoll':
        SynthSounds.diceRoll(volume);
        break;
      case 'diceImpact':
        SynthSounds.diceImpact(volume);
        break;
      case 'countdown':
        SynthSounds.countdown(volume);
        break;
      case 'ambient':
        // No synth fallback for ambient
        break;
      case 'battleMusic':
        // No synth fallback for music
        break;
      default:
        console.debug(`Unknown sound: ${sound}`);
    }
  }

  // ==========================================================================
  // AMBIENT & MUSIC CONTROL
  // ==========================================================================

  /**
   * Start ambient background loop with fade in
   */
  startAmbient(fadeInMs = 2000): void {
    if (!this.ambientLoop) {
      console.debug('No ambient audio loaded for current theme');
      return;
    }

    this.ambientLoop.play();
    this.ambientLoop.fade(0, this.config.ambientVolume * this.config.masterVolume, fadeInMs);
  }

  /**
   * Stop ambient with fade out
   */
  stopAmbient(fadeOutMs = 1000): void {
    if (!this.ambientLoop) return;

    this.ambientLoop.fade(this.ambientLoop.volume(), 0, fadeOutMs);
    setTimeout(() => {
      this.ambientLoop?.stop();
    }, fadeOutMs);
  }

  /**
   * Trigger battle music! (Fades in dramatically)
   */
  startBattleMusic(fadeInMs = 500): void {
    if (!this.battleMusic) {
      console.debug('No battle music loaded for current theme');
      // Fallback: play a dramatic synth riff
      this.playBattleMusicSynth();
      return;
    }

    // Duck the ambient
    if (this.ambientLoop) {
      this.ambientLoop.fade(
        this.ambientLoop.volume(),
        this.config.ambientVolume * 0.3 * this.config.masterVolume,
        fadeInMs
      );
    }

    this.battleMusic.play();
    this.battleMusic.fade(0, this.config.musicVolume * this.config.masterVolume, fadeInMs);
  }

  /**
   * End battle music (fade out, restore ambient)
   */
  stopBattleMusic(fadeOutMs = 2000): void {
    if (this.battleMusic) {
      this.battleMusic.fade(this.battleMusic.volume(), 0, fadeOutMs);
      setTimeout(() => {
        this.battleMusic?.stop();
      }, fadeOutMs);
    }

    // Restore ambient volume
    if (this.ambientLoop) {
      this.ambientLoop.fade(
        this.ambientLoop.volume(),
        this.config.ambientVolume * this.config.masterVolume,
        fadeOutMs
      );
    }
  }

  /**
   * Synth-based battle music stinger (when no music file loaded)
   */
  private playBattleMusicSynth(): void {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return;

    const volume = this.config.musicVolume * this.config.masterVolume;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    // Power chord stinger (E5 power chord)
    const frequencies = [164.81, 246.94, 329.63]; // E3, B3, E4
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const oscGain = ctx.createGain();
      oscGain.connect(gain);
      oscGain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);

      osc.connect(oscGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2);
    });
  }

  // ==========================================================================
  // VOLUME & MUTE CONTROLS
  // ==========================================================================

  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.config.masterVolume);
  }

  setSfxVolume(volume: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMusicVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    // Update playing music if any
    if (this.battleMusic && this.battleMusic.playing()) {
      this.battleMusic.volume(this.config.musicVolume * this.config.masterVolume);
    }
  }

  setAmbientVolume(volume: number): void {
    this.config.ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.ambientLoop && this.ambientLoop.playing()) {
      this.ambientLoop.volume(this.config.ambientVolume * this.config.masterVolume);
    }
  }

  mute(): void {
    this.isMuted = true;
    Howler.mute(true);
  }

  unmute(): void {
    this.isMuted = false;
    Howler.mute(false);
  }

  toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  // ==========================================================================
  // SPECIAL EFFECTS
  // ==========================================================================

  /**
   * Play countdown sequence (called once per second)
   * Gets more urgent as time runs out
   */
  playCountdownTick(secondsRemaining: number): void {
    if (secondsRemaining <= 3) {
      // Urgent - higher pitch
      SynthSounds.countdown(this.config.sfxVolume * this.config.masterVolume, 'high');
    } else if (secondsRemaining <= 10) {
      // Normal tick
      SynthSounds.countdown(this.config.sfxVolume * this.config.masterVolume, 'low');
    }
    // Beyond 10 seconds - no tick
  }

  /**
   * Victory fanfare with optional synth enhancement
   */
  playVictoryFanfare(): void {
    this.play('victory', { volume: 1.2 }); // Slightly louder for impact
  }

  /**
   * Complete dice roll sequence (roll -> impact)
   */
  async playDiceSequence(durationMs = 1500): Promise<void> {
    this.play('diceRoll');
    
    // Play impact at the end
    return new Promise((resolve) => {
      setTimeout(() => {
        this.play('diceImpact', { volume: 1.3 });
        resolve();
      }, durationMs);
    });
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  get initialized(): boolean {
    return this.isInitialized;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  get currentThemeId(): ThemeId {
    return this.currentTheme;
  }

  getConfig(): Readonly<AudioMixerConfig> {
    return { ...this.config };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const audioMixer = new AudioMixer();

// Legacy compatibility - wrap old playSound calls
export function playSound(type: string, volume = 0.3): void {
  const soundMap: Record<string, SoundKey> = {
    vote: 'votecast',
    tick: 'timerTick',
    victory: 'victory',
    error: 'error',
    whoosh: 'whoosh',
    chime: 'uiClick',
    buzz: 'timerEnd',
  };

  const sound = soundMap[type] ?? (type as SoundKey);
  audioMixer.play(sound, { volume });
}

export function initAudio(): void {
  audioMixer.init();
}

export default audioMixer;
