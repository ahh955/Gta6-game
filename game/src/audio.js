// Solmar City — every sound is synthesized with WebAudio: no audio files.
// The context starts on the first user gesture; until then every call is a
// safe no-op, which also keeps headless screenshot runs silent.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    unlocked: false, // set by the first user gesture; nothing creates a
    // context before then, so headless runs stay silent
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    musicTimer: 0,
    musicStep: 0,
    musicOn: false,
  };

  function ensure() {
    if (!audio.unlocked) return false;
    if (audio.ctx) return true;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      audio.ctx = new Ctor();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.5;
      audio.master.connect(audio.ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  function tone(freq, dur, type, volume, when = 0, slideTo = null) {
    if (!ensure()) return;
    const t0 = audio.ctx.currentTime + when;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, volume, filterFreq) {
    if (!ensure()) return;
    const t0 = audio.ctx.currentTime;
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = audio.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = audio.ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    source.start(t0);
  }

  return {
    // Call from a user gesture (start screen key / click).
    unlock() {
      audio.unlocked = true;
      if (ensure() && audio.ctx.state === 'suspended') audio.ctx.resume();
    },
    setMuted(muted) {
      audio.muted = muted;
      if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return audio.muted;
    },
    click() {
      tone(880, 0.07, 'sine', 0.15);
    },
    shot() {
      noise(0.14, 0.5, 1800);
      tone(160, 0.1, 'square', 0.2, 0, 60);
    },
    punch() {
      noise(0.08, 0.35, 500);
      tone(120, 0.09, 'sine', 0.3, 0, 70);
    },
    coin() {
      tone(1320, 0.09, 'sine', 0.2);
      tone(1760, 0.16, 'sine', 0.2, 0.08);
    },
    checkpoint() {
      tone(990, 0.1, 'triangle', 0.22);
      tone(1480, 0.18, 'triangle', 0.22, 0.09);
    },
    raceStart() {
      tone(660, 0.12, 'square', 0.18);
      tone(660, 0.12, 'square', 0.18, 0.18);
      tone(990, 0.3, 'square', 0.22, 0.36);
    },
    missionDone() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, i * 0.13));
    },
    busted() {
      tone(392, 0.25, 'sawtooth', 0.16);
      tone(311, 0.25, 'sawtooth', 0.16, 0.22);
      tone(233, 0.5, 'sawtooth', 0.16, 0.44);
    },
    wasted() {
      tone(330, 0.3, 'sawtooth', 0.16, 0, 110);
      tone(220, 0.5, 'sawtooth', 0.16, 0.3, 82);
    },
    crash() {
      noise(0.2, 0.4, 700);
    },
    // Continuous engine hum; call every frame with speed 0..1.
    engine(speed01, driving) {
      if (!ensure()) return;
      if (!driving || speed01 < 0.02) {
        if (audio.engineGain) audio.engineGain.gain.value = 0;
        return;
      }
      if (!audio.engineOsc) {
        audio.engineOsc = audio.ctx.createOscillator();
        audio.engineOsc.type = 'sawtooth';
        audio.engineGain = audio.ctx.createGain();
        audio.engineGain.gain.value = 0;
        const filter = audio.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        audio.engineOsc.connect(filter);
        filter.connect(audio.engineGain);
        audio.engineGain.connect(audio.master);
        audio.engineOsc.start();
      }
      audio.engineOsc.frequency.value = 55 + speed01 * 130;
      audio.engineGain.gain.value = 0.05 + speed01 * 0.05;
    },
    // Two-tone police siren while a chase is near.
    siren(on) {
      if (!ensure()) return;
      if (!on) {
        if (audio.sirenGain) audio.sirenGain.gain.value = 0;
        return;
      }
      if (!audio.sirenOsc) {
        audio.sirenOsc = audio.ctx.createOscillator();
        audio.sirenOsc.type = 'triangle';
        audio.sirenGain = audio.ctx.createGain();
        audio.sirenGain.gain.value = 0;
        audio.sirenOsc.connect(audio.sirenGain);
        audio.sirenGain.connect(audio.master);
        audio.sirenOsc.start();
        audio.sirenOsc._phase = 0;
      }
      audio.sirenOsc._phase += 0.03;
      const high = Math.sin(audio.sirenOsc._phase * 2) > 0;
      audio.sirenOsc.frequency.value = high ? 950 : 700;
      audio.sirenGain.gain.value = 0.045;
    },
    startMusic() {
      audio.musicOn = true;
    },
    stopMusic() {
      audio.musicOn = false;
    },
    // A laid-back bass-and-hat loop, scheduled a step at a time.
    update(dt) {
      if (!audio.musicOn || !audio.ctx) return;
      audio.musicTimer -= dt;
      if (audio.musicTimer > 0) return;
      audio.musicTimer = 0.24;
      const bassLine = [110, 0, 110, 0, 130.8, 0, 98, 0, 110, 0, 146.8, 0, 130.8, 0, 98, 0];
      const note = bassLine[audio.musicStep % bassLine.length];
      if (note) tone(note, 0.22, 'triangle', 0.12);
      if (audio.musicStep % 2 === 0) noise(0.03, 0.05, 6000);
      if (audio.musicStep % 8 === 4) tone(65, 0.18, 'sine', 0.2, 0, 45);
      audio.musicStep += 1;
    },
  };
}
