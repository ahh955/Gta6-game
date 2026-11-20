// Solmar City — WebAudio sound: synthesized SFX and three radio stations.
// Everything is generated with oscillators and filtered noise; no audio files.

const AudioSys = (() => {
  let ctx = null, master = null, musicBus = null, sfxBus = null;
  let radioOn = true, station = 0, muted = false;
  let seqTimer = null, step = 0, nextStepTime = 0;
  const STEP = 0.135; // seconds per 16th-note step at ~111 BPM

  // Three stations, each with its own key, waveform and pattern flavour.
  const STATIONS = [
    { name: 'SOL 98.5', style: 'Sunset Synthwave', root: 220.00, wave: 'sawtooth', bassWave: 'triangle', bpm: 112, bright: true },
    { name: 'BAY BREEZE 101', style: 'Coastal Chill', root: 196.00, wave: 'sine', bassWave: 'sine', bpm: 84, bright: false },
    { name: 'HEATWAVE 99', style: 'Street Bass', root: 233.08, wave: 'square', bassWave: 'sawtooth', bpm: 128, bright: true },
  ];
  // Minor-key step patterns (semitone offsets from the station root).
  const LEAD_PATTERNS = [
    [0, -1, 3, 7, 10, 7, 3, -1, 0, 3, 7, 12, 10, 7, 3, 0],
    [0, 3, 7, 3, 10, 7, 3, 0, 5, 3, 0, -2, 3, 7, 5, 3],
    [0, 0, 7, 0, 10, 0, 7, 12, 0, 0, 7, 10, 12, 10, 7, 3],
  ];
  const BASS_PATTERNS = [
    [0, -1, 0, -1, 0, -1, 3, -1, 0, -1, 0, -1, 5, -1, 3, -1],
    [0, -1, -1, 0, -1, -1, 5, -1, 3, -1, -1, 0, -1, -1, 7, -1],
    [0, 0, -1, 0, -1, 0, -1, 0, 0, -1, 0, -1, 3, -1, 5, -1],
  ];

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.34; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      startSequencer();
      return true;
    } catch (e) { return false; }
  }

  function noteFreq(root, semis) { return root * Math.pow(2, semis / 12); }

  function playTone(freq, time, dur, type, vol, bus, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, time);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), time + dur);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(time); o.stop(time + dur + 0.05);
  }

  function playNoise(time, dur, vol, filterFreq, type) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = filterFreq || 800;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(time);
  }

  // Radio sequencer: schedules one 16-step bar ahead, station by station.
  function startSequencer() {
    if (seqTimer) return;
    nextStepTime = ctx.currentTime + 0.1; step = 0;
    seqTimer = setInterval(() => {
      if (!ctx || !radioOn || muted) { nextStepTime = ctx.currentTime + 0.1; return; }
      const st = STATIONS[station];
      const stepDur = 60 / st.bpm / 4;
      while (nextStepTime < ctx.currentTime + 0.25) {
        scheduleStep(st, step % 16, nextStepTime, stepDur);
        nextStepTime += stepDur;
        step++;
      }
    }, 90);
  }

  function scheduleStep(st, s, t, stepDur) {
    const lead = LEAD_PATTERNS[station][s];
    const bass = BASS_PATTERNS[station][s];
    if (lead !== -1 && (s % 2 === 0 || station === 2)) {
      playTone(noteFreq(st.root, lead) * 2, t, stepDur * 1.8, st.wave, station === 1 ? 0.05 : 0.075, musicBus);
    }
    if (bass !== -1) playTone(noteFreq(st.root, bass) / 2, t, stepDur * 2.2, st.bassWave, 0.16, musicBus);
    if (s % 4 === 0) playTone(90, t, 0.12, 'sine', 0.22, musicBus, 45); // kick
    if (s % 4 === 2 && station !== 1) playNoise(t, 0.05, 0.10, 6000, 'highpass'); // hat
    if (s === 4 || s === 12) playNoise(t, 0.09, 0.12, 1800, 'bandpass'); // snare-ish
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  // --- SFX (all guarded: safe to call before init) ---
  function shot(kind) {
    if (!ctx || muted) return;
    const t = now();
    if (kind === 'shotgun') { playNoise(t, 0.22, 0.5, 1200); playTone(120, t, 0.15, 'sine', 0.4, sfxBus, 40); }
    else if (kind === 'rifle') { playNoise(t, 0.14, 0.4, 2400); playTone(200, t, 0.08, 'square', 0.2, sfxBus, 60); }
    else if (kind === 'smg') { playNoise(t, 0.07, 0.3, 3000); }
    else { playNoise(t, 0.1, 0.35, 1800); playTone(160, t, 0.07, 'square', 0.18, sfxBus, 70); }
  }
  function explosion() {
    if (!ctx || muted) return;
    const t = now();
    playNoise(t, 0.9, 0.8, 500); playTone(70, t, 0.7, 'sine', 0.7, sfxBus, 28);
    playNoise(t + 0.05, 0.4, 0.4, 2000, 'bandpass');
  }
  function sirenBlip() {
    if (!ctx || muted) return;
    const t = now();
    playTone(720, t, 0.32, 'triangle', 0.10, sfxBus, 980);
    playTone(980, t + 0.32, 0.32, 'triangle', 0.10, sfxBus, 720);
  }
  function crash() { if (ctx && !muted) playNoise(now(), 0.18, 0.4, 900); }
  function pickup() {
    if (!ctx || muted) return;
    playTone(660, now(), 0.09, 'sine', 0.25, sfxBus);
    playTone(990, now() + 0.09, 0.14, 'sine', 0.25, sfxBus);
  }
  function missionDone() {
    if (!ctx || muted) return;
    const t = now(), seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => playTone(f, t + i * 0.13, 0.22, 'triangle', 0.28, sfxBus));
  }
  function missionFail() {
    if (!ctx || muted) return;
    const t = now();
    playTone(392, t, 0.25, 'sawtooth', 0.18, sfxBus, 380);
    playTone(311, t + 0.25, 0.4, 'sawtooth', 0.18, sfxBus, 300);
  }
  function click() { if (ctx && !muted) playTone(880, now(), 0.06, 'sine', 0.2, sfxBus); }
  function horn() { if (ctx && !muted) { playTone(370, now(), 0.25, 'square', 0.15, sfxBus); playTone(466, now(), 0.25, 'square', 0.12, sfxBus); } }
  function engineTick(speed01) {
    if (!ctx || muted || !G || !G.player.inCar) return;
    if (Math.random() > 0.3) return;
    playTone(55 + speed01 * 130, now(), 0.09, 'sawtooth', 0.05, sfxBus);
  }

  function setStation(i) {
    station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
    step = 0;
    return STATIONS[station];
  }
  function nextStation() { return setStation(station + 1); }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.9;
    return muted;
  }
  function currentStation() { return STATIONS[station]; }
  function isMuted() { return muted; }
  function setRadioOn(v) { radioOn = v; }

  return { ensure, shot, explosion, sirenBlip, crash, pickup, missionDone, missionFail, click, horn, engineTick, setStation, nextStation, toggleMute, currentStation, isMuted, setRadioOn, STATIONS };
})();
