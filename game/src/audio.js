// WebAudio SFX + 3 synthesized radio stations. No audio files, no network.
// All sound is generated: engine hum (sawtooth + lowpass), siren (LFO'd
// triangle), horn, skids (filtered noise), gunshot (noise burst).
// Radio stations are chord-pad loops scheduled on a lookahead timer.
// API: createAudio() -> { init(), resume(), muted, toggleMute(),
//   setEngine(rpm01, on), siren(on), horn(), skid(), shot(), explosion(),
//   station, stationName, trackName, nextStation(), setStation(i), update(dt) }
export const STATIONS = [
  { name: 'SUNSET 88.5', genre: 'Synthwave', root: 220.0, scale: [0, 3, 7, 10], bpm: 96, wave: 'sawtooth' },
  { name: 'CORAL DUB FM', genre: 'Reggae-dub', root: 146.83, scale: [0, 4, 7, 10], bpm: 72, wave: 'triangle' },
  { name: 'NIGHT DRIVE', genre: 'Jazz-funk', root: 174.61, scale: [0, 3, 7, 9, 14], bpm: 112, wave: 'square' },
];
const TRACKS = [
  ['Neon Boulevard', 'Palm Static', 'Golden Hour Run'],
  ['Tide and Smoke', 'Reef Runner', 'Slow Sun Dub'],
  ['Midnight Overpass', 'Velvet Intersection', 'Last Ferry Home'],
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let station = 0;
  let track = 0;
  let muted = false;
  let nextNoteTime = 0;
  let step = 0;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);
    // Engine: two detuned saws through a lowpass.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(sfxGain);
    engineOsc.start();
    nextNoteTime = ctx.currentTime + 0.1;
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function setEngine(rpm01, on) {
    if (!ctx || !engineOsc) return;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(on ? 0.05 + rpm01 * 0.08 : 0, t, 0.1);
    engineOsc.frequency.setTargetAtTime(45 + rpm01 * 130, t, 0.08);
    engineFilter.frequency.setTargetAtTime(220 + rpm01 * 900, t, 0.1);
  }

  function siren(on) {
    if (!ctx) return;
    if (on && !sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 850;
      sirenLfo = ctx.createOscillator();
      sirenLfo.type = 'sine';
      sirenLfo.frequency.value = 0.7;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 280;
      sirenLfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.045;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(sfxGain);
      sirenOsc.start();
      sirenLfo.start();
    } else if (!on && sirenOsc) {
      try { sirenOsc.stop(); sirenLfo.stop(); } catch { /* already stopped */ }
      sirenOsc = null; sirenLfo = null; sirenGain = null;
    }
  }

  function noiseBurst(dur, freq, gainVal, type = 'lowpass') {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gainVal;
    src.connect(filter); filter.connect(g); g.connect(sfxGain);
    src.start();
  }

  function horn() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [392, 494].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, t);
      g.gain.setValueAtTime(0, t + 0.35);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + 0.4);
    });
  }

  function skid() { noiseBurst(0.35, 900, 0.12, 'bandpass'); }
  function shot() { noiseBurst(0.12, 2200, 0.35, 'highpass'); }
  function explosion() { noiseBurst(0.9, 180, 0.6); }

  function playChord(when, freqs, wave, dur) {
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.11, when + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g); g.connect(musicGain);
      o.start(when); o.stop(when + dur + 0.05);
    }
  }

  // One scheduler step: a pad chord + a soft bass note.
  function scheduleStep() {
    const st = STATIONS[station];
    const beat = 60 / st.bpm;
    const prog = [0, 0, -4, -2]; // chord roots in semitones, 4-chord loop
    const rootShift = prog[step % 4];
    const root = st.root * Math.pow(2, rootShift / 12);
    const freqs = st.scale.slice(0, 3).map((s) => root * Math.pow(2, s / 12));
    playChord(nextNoteTime, freqs, st.wave, beat * 3.6);
    playChord(nextNoteTime, [root / 2], 'sine', beat * 3.4);
    nextNoteTime += beat * 4;
    step++;
    if (step % 32 === 0) track = (track + 1) % TRACKS[station].length;
  }

  function update() {
    if (!ctx || muted) return;
    while (nextNoteTime < ctx.currentTime + 0.4) scheduleStep();
  }

  function setStation(i) {
    station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
    track = 0;
    step = 0;
    if (ctx) nextNoteTime = ctx.currentTime + 0.05;
  }

  return {
    init, resume, setEngine, siren, horn, skid, shot, explosion, update,
    setStation,
    nextStation() { setStation(station + 1); },
    toggleMute() {
      muted = !muted;
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05);
      return muted;
    },
    get muted() { return muted; },
    get station() { return station; },
    get stationName() { return STATIONS[station].name; },
    get trackName() { return TRACKS[station][track]; },
  };
}
