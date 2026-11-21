// Solmar City 3D — audio: three WebAudio radio stations (synthesised
// loops, no audio files) plus sirens, engine hum and gunshots.

import { RADIO_STATIONS } from "./config.js";

const STATION_SCALES = {
  "solmar-fm": [220, 261.6, 329.6, 392, 440, 523.3],
  "coral-talk": [146.8, 174.6, 196, 220, 261.6],
  "wave-973": [196, 246.9, 293.7, 329.6, 392, 440],
};

export class Radio {
  constructor() {
    this.stationIndex = 0;
    this.songIndex = 0;
    this.ctx = null;
    this.master = null;
    this.playing = false;
    this.nextNoteAt = 0;
    this.step = 0;
  }

  get station() {
    return RADIO_STATIONS[this.stationIndex];
  }

  get song() {
    return this.station.songs[this.songIndex];
  }

  get label() {
    return `${this.station.name} — "${this.song.title}" — ${this.song.artist}`;
  }

  // Audio starts only after a user gesture (browser policy); the HUD shows
  // the station either way.
  ensureContext() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  start() {
    if (!this.ensureContext()) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.playing = true;
    this.nextNoteAt = this.ctx.currentTime + 0.1;
  }

  stop() {
    this.playing = false;
  }

  nextStation() {
    this.stationIndex = (this.stationIndex + 1) % RADIO_STATIONS.length;
    this.songIndex = 0;
    this.step = 0;
  }

  nextSong() {
    this.songIndex = (this.songIndex + 1) % this.station.songs.length;
    this.step = 0;
  }

  // A tiny step sequencer: a bass note and a lead note per eighth-note step.
  update() {
    if (!this.playing || !this.ctx) return;
    const scale = STATION_SCALES[this.station.id];
    const stepDur = 0.22;
    while (this.nextNoteAt < this.ctx.currentTime + 0.15) {
      const t = this.nextNoteAt;
      const bass = scale[this.step % scale.length] / 2;
      this.tone(bass, t, stepDur * 0.9, "triangle", 0.5);
      if (this.step % 2 === 0) {
        const lead = scale[(this.step * 3 + 2) % scale.length];
        this.tone(lead, t, stepDur * 0.7, "sine", 0.3);
      }
      if (this.step % 8 === 7) this.nextSong();
      this.step++;
      this.nextNoteAt += stepDur;
    }
  }

  tone(freq, t, dur, type, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // One-shot effects: gunshot, siren blip, cash register.
  sfx(kind) {
    if (!this.ensureContext() || this.ctx.state === "suspended") return;
    const t = this.ctx.currentTime;
    if (kind === "shot") {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.15);
    } else if (kind === "siren") {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(700, t);
      o.frequency.linearRampToValueAtTime(950, t + 0.35);
      o.frequency.linearRampToValueAtTime(700, t + 0.7);
      g.gain.setValueAtTime(0.08, t);
      g.gain.setValueAtTime(0.08, t + 0.7);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.75);
    } else if (kind === "cash") {
      this.tone(880, t, 0.1, "sine", 0.4);
      this.tone(1318, t + 0.09, 0.16, "sine", 0.4);
    }
  }
}
