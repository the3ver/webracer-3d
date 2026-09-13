export class AudioSynth {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicPlaying = false;

    // Engine sound nodes
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;

    // Music timer
    this.bgmTimer = null;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);

      this.initEngineSynth();
      this.startSynthwaveBGM();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
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
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  updateEngine(speed, isBoosting) {
    if (!this.ctx || !this.engineOsc1 || this.isMuted) return;

    // Modulate pitch from 60 Hz (idle) to 320 Hz (top speed)
    const normSpeed = Math.min(1.0, Math.abs(speed) / 220);
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
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'emp') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'mine') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
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
    gain.connect(this.masterGain);

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
    gain.connect(this.masterGain);
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
    gain.connect(this.masterGain);
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
      gain.connect(this.masterGain);
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
      gain.connect(this.masterGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
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
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + stepTime);

        // Cyber Snare on beats 4 & 12
        if (step === 4 || step === 12) {
          const snareOsc = this.ctx.createOscillator();
          const snareGain = this.ctx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(180, now);
          snareOsc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
          snareGain.gain.setValueAtTime(0.15, now);
          snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

          snareOsc.connect(snareGain);
          snareGain.connect(this.masterGain);
          snareOsc.start(now);
          snareOsc.stop(now + 0.1);
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
