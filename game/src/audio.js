// Sound, synthesized live with WebAudio: no audio files at all. An engine hum that follows
// the car's speed, a two-tone police siren, gunshots, pickups, a mission jingle and a slow
// golden-hour music loop (a bass line under soft chords). Everything is guarded so a browser
// with audio suspended or absent never throws.
const MUSIC_NOTES = [110, 130.81, 98, 146.83]; // A2 C3 G2 D3: a slow four-bar bass walk
const CHORDS = [
  [220, 261.63, 329.63],
  [174.61, 220, 261.63],
  [196, 246.94, 293.66],
  [146.83, 220, 293.66],
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = 0;
  let musicStep = 0;
  let started = false;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function start() {
    if (started) return;
    if (!ensure()) return;
    started = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    // Engine: a sawtooth through a lowpass, its pitch following speed.
    try {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: a sine that alternates between two tones.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      // Audio nodes are a bonus; the game plays fine without them.
    }
  }

  function blip(frequency, duration, type, volume, slideTo) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume || 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  }

  function noiseBurst(duration, volume) {
    if (!ctx || muted) return;
    try {
      const length = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = volume || 0.3;
      source.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // ignore
    }
  }

  function playMusicStep(dt) {
    musicTimer -= dt;
    if (musicTimer > 0) return;
    musicTimer = 0.55;
    const bar = Math.floor(musicStep / 4) % 4;
    const beat = musicStep % 4;
    if (beat === 0) {
      blip(MUSIC_NOTES[bar], 0.5, 'triangle', 0.16);
      for (const note of CHORDS[bar]) blip(note, 1.6, 'sine', 0.045);
    } else if (beat === 2) {
      blip(MUSIC_NOTES[bar] * 1.5, 0.3, 'triangle', 0.1);
    }
    musicStep += 1;
  }

  return {
    start,
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    shot() {
      noiseBurst(0.12, 0.35);
      blip(160, 0.09, 'square', 0.12, 60);
    },
    crash() {
      noiseBurst(0.25, 0.4);
      blip(90, 0.2, 'sawtooth', 0.2, 40);
    },
    pickup() {
      blip(660, 0.1, 'sine', 0.2);
      setTimeout(() => blip(880, 0.14, 'sine', 0.2), 90);
    },
    missionStart() {
      blip(440, 0.12, 'triangle', 0.2);
      setTimeout(() => blip(554, 0.12, 'triangle', 0.2), 120);
      setTimeout(() => blip(659, 0.2, 'triangle', 0.22), 240);
    },
    missionComplete() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => setTimeout(() => blip(n, 0.22, 'triangle', 0.22), i * 130));
    },
    raceStart() {
      // A starter's countdown: three low blips, then a high go.
      [330, 330, 330, 880].forEach((n, i) => setTimeout(() => blip(n, i === 3 ? 0.3 : 0.12, 'square', 0.18), i * 170));
    },
    doubloon() {
      blip(1318, 0.09, 'sine', 0.2);
      setTimeout(() => blip(1760, 0.18, 'sine', 0.2), 80);
    },
    punch() {
      noiseBurst(0.07, 0.25);
    },
    enterCar() {
      blip(220, 0.08, 'square', 0.12, 160);
      setTimeout(() => blip(180, 0.1, 'square', 0.1, 120), 90);
    },
    /** Called every frame: engine, siren and music follow the game state. */
    update(dt, state) {
      if (!ctx || !started) return;
      try {
        const player = state.player;
        const speed = player.car ? Math.abs(player.car.speed) : 0;
        if (engineOsc && engineGain) {
          engineOsc.frequency.value = 45 + speed * 0.22;
          engineGain.gain.value = muted ? 0 : player.car ? 0.05 + Math.min(0.09, speed * 0.00012) : 0;
        }
        const policeNear = state.cars.some((c) => c.driver === 'police' && Math.hypot(c.x - player.x, c.y - player.y) < 900);
        if (sirenOsc && sirenGain) {
          sirenOsc.frequency.value = Math.floor(state.time * 2.4) % 2 === 0 ? 720 : 960;
          sirenGain.gain.value = muted || !policeNear ? 0 : 0.035;
        }
        if (!muted) playMusicStep(dt);
      } catch {
        // ignore
      }
    },
  };
}
