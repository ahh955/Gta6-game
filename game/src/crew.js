// Solmar City 3D — the crew: Juno (driver), Marco (mechanic) and Tess
// (lookout), each with an ability on a cooldown.

import { CREW } from "./config.js";

export class Crew {
  constructor() {
    this.members = CREW.map((m) => ({ ...m, readyIn: 0, uses: 0 }));
  }

  // Use a crew ability. Returns the effect description, or null on cooldown.
  useAbility(id) {
    const m = this.members.find((x) => x.id === id);
    if (!m || m.readyIn > 0) return null;
    m.readyIn = m.cooldown;
    m.uses++;
    return m;
  }

  update(dt) {
    for (const m of this.members) {
      m.readyIn = Math.max(0, m.readyIn - dt);
    }
  }

  get readyCount() {
    return this.members.filter((m) => m.readyIn <= 0).length;
  }
}
