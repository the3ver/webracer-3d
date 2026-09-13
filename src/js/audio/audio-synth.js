export class AudioSynth {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicPlaying = false;

    // Volume settings (persisted in localStorage)
    const savedMusic = typeof localStorage !== 'undefined' ? localStorage.getItem('webracer_music_vol') : null;
    const savedSfx = typeof localStorage !== 'undefined' ? localStorage.getItem('webracer_sfx_vol') : null;
    this.musicVolume = savedMusic !== null ? parseFloat(savedMusic) : 0.65;
    this.sfxVolume = savedSfx !== null ? parseFloat(savedSfx) : 0.80;

    // Master & Sub-Gain nodes
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    // Engine sound nodes
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;

    // Music timer
    this.bgmTimer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gain -> Destination
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      // Music Sub-Gain -> Master
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      // SFX Sub-Gain -> Master
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.initEngineSynth();
      this.startSynthwaveBGM();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.02);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('webracer_music_vol', this.musicVolume.toString());
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.02);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('webracer_sfx_vol', this.sfxVolume.toString());
    }
  }

  getMusicVolume() {
    return this.musicVolume;
  }

  getSfxVolume() {
    return this.sfxVolume;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    return this.isMuted;
  }

  initEngineSynth() {
    if (!this.ctx) return;

    // Subtractive dual oscillator engine synth
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';

    this.engineOsc1.frequency.value = 65;
    this.engineOsc2.frequency.value = 130;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 250;
    this.engineFilter.Q.value = 4.0;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.05;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  updateEngine(speed, isBoosting) {
    if (!this.ctx || !this.engineOsc1 || this.isMuted) return;

    // Modulate pitch from 60 Hz (idle) to 320 Hz (top speed)
    const normSpeed = Math.min(1.0, Math.abs(speed) / 145);
    const targetFreq = 55 + (normSpeed * 220) + (isBoosting ? 60 : 0);
    const targetCutoff = 180 + (normSpeed * 1200) + (isBoosting ? 600 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.05);
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.05);

    // Throttle volume
    const vol = 0.04 + normSpeed * 0.08 + (isBoosting ? 0.04 : 0);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.05);
  }

  playShoot(type) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'missile') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'emp') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'mine') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  }

  playExplosion() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Procedural noise burst with lowpass filter sweep
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  playBoost() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playShield() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.linearRampToValueAtTime(700, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playPickup() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 3-note ascending synth chime (C5 -> E5 -> G5)
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + idx * 0.06;

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.18, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.12);
    });
  }

  playLapChime() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  }

  playRespawn() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playSnare(now, volume = 0.22) {
    if (!this.ctx || this.isMuted) return;

    // 1. Gated Noise Body (80s LinnDrum / Simmons synthwave gated reverb character)
    const noiseDuration = 0.20;
    const bufferSize = Math.floor(this.ctx.sampleRate * noiseDuration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2400, now);
    noiseFilter.Q.setValueAtTime(1.8, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 1.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.musicGain);

    noiseSource.start(now);
    noiseSource.stop(now + noiseDuration);

    // 2. Tonal Membrane Strike Punch (fast pitch sweep)
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();

    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(240, now);
    toneOsc.frequency.exponentialRampToValueAtTime(85, now + 0.08);

    toneGain.gain.setValueAtTime(volume * 0.9, now);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    toneOsc.connect(toneGain);
    toneGain.connect(this.musicGain);

    toneOsc.start(now);
    toneOsc.stop(now + 0.09);
  }

  playHiHat(now, volume = 0.04) {
    if (!this.ctx || this.isMuted) return;

    const hatDuration = 0.035;
    const bufferSize = Math.floor(this.ctx.sampleRate * hatDuration);
    const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + hatDuration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    src.start(now);
    src.stop(now + hatDuration);
  }

  startSynthwaveBGM() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;

    // Classic 80s Cyberpunk Bassline Arpeggio (Am - F - C - G)
    const chords = [
      [110, 130.81, 164.81], // A2, C3, E3
      [87.31, 110, 130.81],  // F2, A2, C3
      [130.81, 164.81, 196], // C3, E3, G3
      [98, 123.47, 146.83]   // G2, B2, D3
    ];

    let chordIdx = 0;
    let step = 0;
    const tempo = 124; // BPM
    const stepTime = (60 / tempo) / 4; // 16th notes

    const playBassBeat = () => {
      if (!this.musicPlaying || !this.ctx) return;
      if (!this.isMuted) {
        const now = this.ctx.currentTime;
        const currentChord = chords[chordIdx];
        const rootFreq = currentChord[step % currentChord.length];

        // Bass synth note
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(rootFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + stepTime * 0.9);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + stepTime * 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + stepTime);

        // Classic 80s Synthwave Backbeat Snare on beats 4 & 12 (2 & 4 in 4/4 time)
        if (step === 4 || step === 12) {
          this.playSnare(now, 0.22);
        } else if (step === 15 && chordIdx === chords.length - 1) {
          // Snappy 16th-note snare fill at the end of the 4-bar chord loop
          this.playSnare(now, 0.15);
        }

        // Subtle closed hi-hat on odd 16th steps (syncopated groove)
        if (step % 2 === 1 && step !== 15) {
          this.playHiHat(now, 0.04);
        }
      }

      step++;
      if (step >= 16) {
        step = 0;
        chordIdx = (chordIdx + 1) % chords.length;
      }

      this.bgmTimer = setTimeout(playBassBeat, stepTime * 1000);
    };

    playBassBeat();
  }

  stopBGM() {
    this.musicPlaying = false;
    if (this.bgmTimer) clearTimeout(this.bgmTimer);
  }
}
