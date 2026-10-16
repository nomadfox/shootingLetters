/* Sound Synthesizer Engine & Dynamic BGM Audio Manager using Web Audio API */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterVolume = 0.8;

    // BGM Sequencer State
    this.bgmPlaying = false;
    this.currentTrackCategory = null;
    this.seqTimer = null;
    this.stepIndex = 0;
    this.bpm = 110;
    this.bgmGainNode = null;

    // BGM Track Configurations based on Level Progression & Phase
    this.bgmTracks = {
      chiptune: {
        name: "Upbeat 8-Bit Chiptune",
        bpm: 115,
        type: "square",
        bassNotes: [110, 110, 146.83, 146.83, 164.81, 164.81, 130.81, 130.81],
        leadNotes: [220, 261.63, 329.63, 392.00, 440, 392.00, 329.63, 261.63]
      },
      boss1: {
        name: "High-Tempo Arcade Boss Theme",
        bpm: 135,
        type: "sawtooth",
        bassNotes: [87.31, 87.31, 98.00, 98.00, 110, 110, 130.81, 110],
        leadNotes: [349.23, 392.00, 440, 523.25, 440, 392.00, 349.23, 293.66]
      },
      synthwave: {
        name: "Driving Synthwave / Outrun",
        bpm: 125,
        type: "sawtooth",
        bassNotes: [65.41, 65.41, 73.42, 73.42, 87.31, 87.31, 98.00, 98.00],
        leadNotes: [261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63, 196.00]
      },
      boss2: {
        name: "Aggressive Darksynth Boss Theme",
        bpm: 145,
        type: "sawtooth",
        bassNotes: [55, 55, 61.74, 61.74, 65.41, 65.41, 73.42, 55],
        leadNotes: [440, 466.16, 523.25, 587.33, 523.25, 466.16, 440, 349.23]
      },
      cyberpunk: {
        name: "Fast Cyberpunk / Apocalyptic Synth",
        bpm: 140,
        type: "sawtooth",
        bassNotes: [73.42, 73.42, 82.41, 82.41, 87.31, 87.31, 98.00, 73.42],
        leadNotes: [293.66, 349.23, 440, 523.25, 587.33, 523.25, 440, 349.23]
      },
      finalBoss: {
        name: "Dark Orchestral / Heavy Cyber-Industrial",
        bpm: 150,
        type: "triangle",
        bassNotes: [43.65, 43.65, 48.99, 48.99, 55.00, 55.00, 65.41, 43.65],
        leadNotes: [349.23, 329.63, 293.66, 261.63, 220.00, 261.63, 293.66, 349.23]
      }
    };
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.setValueAtTime(0.12 * this.masterVolume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBGM();
    }
    return !this.muted;
  }

  /* Dynamic BGM Manager Track Switching Logic */
  getCategoryForLevel(level, isBoss) {
    if (level >= 15 && isBoss) return "finalBoss";
    if (level === 10) return "boss2";
    if (level === 5) return "boss1";
    if (level >= 11) return "cyberpunk";
    if (level >= 6) return "synthwave";
    return "chiptune";
  }

  updateBGMForLevel(level, isBoss) {
    const category = this.getCategoryForLevel(level, isBoss);
    if (category !== this.currentTrackCategory || !this.bgmPlaying) {
      this.playBGM(category);
    }
  }

  playBGM(categoryKey) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const track = this.bgmTracks[categoryKey] || this.bgmTracks.chiptune;
    this.currentTrackCategory = categoryKey;
    this.bpm = track.bpm;
    this.stopBGM();

    this.bgmPlaying = true;
    this.stepIndex = 0;

    const intervalMs = (60 / this.bpm / 2) * 1000;
    this.seqTimer = setInterval(() => {
      if (!this.bgmPlaying || this.muted) return;
      this.playSequencerStep(track);
    }, intervalMs);
  }

  playSequencerStep(track) {
    if (!this.ctx || this.ctx.state === 'suspended') return;

    const now = this.ctx.currentTime;
    const duration = 60 / this.bpm / 2;

    // Bassline synth note
    const bassNote = track.bassNotes[this.stepIndex % track.bassNotes.length];
    if (bassNote) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = track.type;
      osc.frequency.setValueAtTime(bassNote, now);

      gain.gain.setValueAtTime(0.08 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);

      osc.connect(gain);
      gain.connect(this.bgmGainNode);

      osc.start(now);
      osc.stop(now + duration);
    }

    // Lead arpeggio synth note
    const leadNote = track.leadNotes[this.stepIndex % track.leadNotes.length];
    if (leadNote && this.stepIndex % 2 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(leadNote, now);

      gain.gain.setValueAtTime(0.05 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

      osc.connect(gain);
      gain.connect(this.bgmGainNode);

      osc.start(now);
      osc.stop(now + duration);
    }

    this.stepIndex++;
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.seqTimer) {
      clearInterval(this.seqTimer);
      this.seqTimer = null;
    }
  }

  /* Sound Effects */
  playLaser() {
    if (this.muted || !this.ctx || this.masterVolume === 0) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

    gain.gain.setValueAtTime(0.2 * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playExplosion() {
    if (this.muted || !this.ctx || this.masterVolume === 0) return;
    this.init();

    const now = this.ctx.currentTime;
    const duration = 0.35;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35 * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  playCityHit() {
    if (this.muted || !this.ctx || this.masterVolume === 0) return;
    this.init();

    const now = this.ctx.currentTime;
    const duration = 0.45;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + duration);

    gain.gain.setValueAtTime(0.4 * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playGameOver() {
    this.stopBGM();
    if (this.muted || !this.ctx || this.masterVolume === 0) return;
    this.init();

    const notes = [220, 207.65, 196, 185];
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const now = this.ctx.currentTime + index * 0.18;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    });
  }
}

window.soundEngine = new SoundEngine();
