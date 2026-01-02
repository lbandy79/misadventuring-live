/**
 * Sound Effects Utility
 * 
 * Uses Web Audio API to generate sounds on the fly.
 * No external files needed! Perfect for prototyping.
 * 
 * Later we can swap these for proper sound files.
 */

type SoundType = 'vote' | 'tick' | 'victory' | 'error' | 'whoosh' | 'chime' | 'buzz';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Ensure audio context is resumed (browsers require user interaction)
export function initAudio(): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

/**
 * Play a synthesized sound effect
 */
export function playSound(type: SoundType, volume = 0.3): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') return; // Don't play if not initialized
    
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.value = volume;

    switch (type) {
      case 'vote':
        playVoteSound(ctx, gainNode);
        break;
      case 'tick':
        playTickSound(ctx, gainNode);
        break;
      case 'victory':
        playVictorySound(ctx, gainNode);
        break;
      case 'error':
        playErrorSound(ctx, gainNode);
        break;
      case 'whoosh':
        playWhooshSound(ctx, gainNode);
        break;
      case 'chime':
        playChimeSound(ctx, gainNode);
        break;
      case 'buzz':
        playBuzzSound(ctx, gainNode);
        break;
    }
  } catch (e) {
    console.debug('Sound playback failed:', e);
  }
}

// Satisfying "pop" sound for voting
function playVoteSound(ctx: AudioContext, gain: GainNode): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  
  osc.connect(gain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

// Tick sound for countdown
function playTickSound(ctx: AudioContext, gain: GainNode): void {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 1000;
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  
  osc.connect(gain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

// Victory fanfare
function playVictorySound(ctx: AudioContext, gain: GainNode): void {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    
    const noteGain = ctx.createGain();
    noteGain.connect(gain);
    noteGain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
    noteGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.12 + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
    
    osc.connect(noteGain);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.3);
  });
}

// Error buzz
function playErrorSound(ctx: AudioContext, gain: GainNode): void {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 150;
  
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  osc.connect(gain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

// Whoosh for transitions
function playWhooshSound(ctx: AudioContext, gain: GainNode): void {
  const noise = ctx.createBufferSource();
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.15);
  filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.3);
  filter.Q.value = 0.5;
  
  gain.gain.setValueAtTime(0.01, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  
  noise.connect(filter);
  filter.connect(gain);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + 0.3);
}

// Chime for notifications
function playChimeSound(ctx: AudioContext, gain: GainNode): void {
  const frequencies = [880, 1108.73]; // A5, C#6
  
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    const noteGain = ctx.createGain();
    noteGain.connect(gain);
    noteGain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.1);
    noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.4);
    
    osc.connect(noteGain);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.4);
  });
}

// Buzz for time running out
function playBuzzSound(ctx: AudioContext, gain: GainNode): void {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 220;
  
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 20;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 50;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  osc.connect(gain);
  lfo.start(ctx.currentTime);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
  lfo.stop(ctx.currentTime + 0.5);
}

export default { playSound, initAudio };
