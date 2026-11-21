// Solmar City 3D — story missions: 10 missions with stages, timers,
// objectives and NEXT steps, plus the tracker the HUD reads.

import { MISSIONS } from "./config.js";

export class MissionManager {
  constructor() {
    this.missions = MISSIONS.map((m) => ({ ...m, completed: false }));
    this.currentIndex = 5; // Mission 6, VAULT RUN — the mid-game showcase
    this.stageIndex = 2; // Stage 3 of 4: grab the cash, escape the vault
    this.timeLeft = 147; // seconds on the stage timer
    this.active = true;
    this.completedCount = 5;
  }

  get current() {
    return this.missions[this.currentIndex];
  }

  get stage() {
    return this.current.stages[this.stageIndex];
  }

  get nextStage() {
    return this.current.stages[this.stageIndex + 1] || "Mission complete — collect your payout";
  }

  get stageLabel() {
    return `STAGE ${this.stageIndex + 1}/${this.current.stages.length}`;
  }

  get timerLabel() {
    const m = Math.floor(this.timeLeft / 60);
    const s = Math.floor(this.timeLeft % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  advanceStage() {
    if (this.stageIndex < this.current.stages.length - 1) {
      this.stageIndex++;
      this.timeLeft = 180;
      return { advanced: true, done: false };
    }
    this.current.completed = true;
    this.completedCount++;
    if (this.currentIndex < this.missions.length - 1) {
      this.currentIndex++;
      this.stageIndex = 0;
      this.timeLeft = 240;
      return { advanced: true, done: true, payout: this.missions[this.currentIndex - 1].payout };
    }
    this.active = false;
    return { advanced: true, done: true, payout: this.current.payout, storyDone: true };
  }

  setMission(index, stage) {
    this.currentIndex = index;
    this.stageIndex = stage;
    this.timeLeft = 180;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
  }
}
