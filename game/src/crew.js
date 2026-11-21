// Solmar City — crew: 3 recruitable members with abilities on keys 7/8/9.
// Recruited by finishing story missions; abilities have cooldowns and only
// work while the member is recruited. Crew status shows in the HUD.
import { createVehicle } from './vehicles.js';

export const CREW = [
  {
    id: 'deck', name: 'Deck Ward', role: 'Getaway driver', key: 'Digit7',
    ability: 'GETAWAY CAR', desc: 'A tuned coupe screeches to your side.',
    unlock: 'hot-wheels', unlockText: 'Finish "Hot Wheels"',
    color: '#e8a33b', initials: 'DW', cooldown: 45,
  },
  {
    id: 'lena', name: 'Lena Cruz', role: 'Hacker', key: 'Digit8',
    ability: 'GHOST SIGNAL', desc: 'Scrambles the PD net: −2 wanted stars.',
    unlock: 'heat-wave', unlockText: 'Finish "Heat Wave"',
    color: '#4da6ff', initials: 'LC', cooldown: 60,
  },
  {
    id: 'tavo', name: 'Big Tavo', role: 'Muscle', key: 'Digit9',
    ability: 'BACKUP', desc: 'Tavo fights beside you for 30 seconds.',
    unlock: 'dockside', unlockText: 'Finish "Dockside Deal"',
    color: '#7ad645', initials: 'BT', cooldown: 75,
  },
];

export function createCrew(scene) {
  const recruited = new Set();
  const cd = { deck: 0, lena: 0, tavo: 0 };

  function recruit(id) { recruited.add(id); }
  function isRecruited(id) { return recruited.has(id); }

  function useAbility(ctx, member) {
    if (!recruited.has(member.id)) {
      ctx.showNotice(`${member.name.toUpperCase()} — ${member.unlockText.toUpperCase()}`);
      return;
    }
    if (cd[member.id] > 0) {
      ctx.showNotice(`${member.ability} — ${Math.ceil(cd[member.id])}S`);
      return;
    }
    cd[member.id] = member.cooldown;
    const p = ctx.player;
    if (member.id === 'deck') {
      const car = createVehicle(scene, {
        type: 'coupe', color: 0xe8a33b,
        x: p.x + 6, z: p.z + 3, heading: p.heading,
      });
      car._route = { alongX: true, center: 0, dir: 1, cruise: 0, parked: true };
      car.topSpeed = 52;
      ctx.traffic.cars.push(car);
      ctx.audio.horn();
      ctx.showNotice('DECK DELIVERED YOUR GETAWAY CAR');
    } else if (member.id === 'lena') {
      const before = ctx.police.wanted;
      ctx.police.setWanted(Math.max(0, before - 2));
      ctx.showNotice(before > 0 ? 'LENA SCRAMBLED THE PD NET — HEAT DOWN' : 'NO HEAT TO SCRAMBLE');
    } else if (member.id === 'tavo') {
      ctx.combat.spawnFighter(p.x + 3, p.z + 3, { ally: true, lifeT: 30 });
      ctx.showNotice('TAVO HAS YOUR BACK — 30S');
    }
  }

  function update(dt, ctx) {
    for (const k of Object.keys(cd)) cd[k] = Math.max(0, cd[k] - dt);
    for (const m of CREW) {
      if (ctx.input.wasPressed(m.key)) useAbility(ctx, m);
    }
  }

  return {
    CREW,
    recruited, cooldowns: cd,
    recruit, isRecruited, useAbility, update,
    crewState() { return { recruited: [...recruited] }; },
    applyCrewState(s) {
      if (Array.isArray(s.recruited)) s.recruited.forEach((id) => recruited.add(id));
    },
  };
}
