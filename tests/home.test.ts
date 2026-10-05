import { describe, expect, it } from 'vitest';
import { newSave, parseSave } from '../src/core/Save';
import { ESTATE, inEstate, newHome, powerOut, unitsFor, useUnits, weekOf, weeksOwed } from '../src/player/Home';
import { dayLabel, weekday } from '../src/world/DayNight';
import { NPC_SPOTS, RESERVED, inRect } from '../src/world/MapData';

describe('weekdays', () => {
  it('day 1 is Monday and weeks roll over', () => {
    expect(weekday(1)).toBe('Monday');
    expect(weekday(7)).toBe('Sunday');
    expect(weekday(8)).toBe('Monday');
    expect(dayLabel(2)).toBe('Tuesday');
    expect(dayLabel(9, true)).toBe('Tue (Wk 2)');
  });
});

describe('home bills', () => {
  it('meter runs down and runs out', () => {
    let h = newHome(24);
    expect(h.units).toBe(20);
    h = useUnits(h, 24 + 24);
    expect(h.units).toBeCloseTo(14);
    h = useUnits(h, 24 * 10);
    expect(powerOut(h)).toBe(true);
    expect(unitsFor(5000)).toBe(25);
  });

  it('service charge is owed each new week', () => {
    const h = newHome();
    expect(weekOf(1)).toBe(1);
    expect(weekOf(8)).toBe(2);
    expect(weeksOwed(h, 5)).toBe(0);
    expect(weeksOwed(h, 8)).toBe(1);
    expect(weeksOwed(h, 15)).toBe(2);
  });

  it('save keeps home and waza, with defaults for old saves', () => {
    const s = newSave();
    s.home.units = 3.5;
    s.waza = 7;
    const back = parseSave(JSON.stringify(s))!;
    expect(back.home.units).toBe(3.5);
    expect(back.waza).toBe(7);
    const old = parseSave(JSON.stringify({ version: 1 }))!;
    expect(old.home.units).toBe(20);
    expect(old.waza).toBe(0);
  });

  it('estate spots and spawn sit inside the reserved estate plot', () => {
    expect(inEstate(ESTATE.spawn.x, ESTATE.spawn.z)).toBe(true);
    expect(RESERVED.some((r) => inRect(r, ESTATE.house.x, ESTATE.house.z))).toBe(true);
    for (const id of ['estate-gate', 'estate-manager', 'estate-door', 'estate-meter']) {
      const s = NPC_SPOTS.find((n) => n.id === id)!;
      expect(inEstate(s.x, s.z), id).toBe(true);
    }
  });
});

describe('house furniture', () => {
  it('every item has a price and fits inside the house', async () => {
    const { FURNITURE, HOUSE } = await import('../src/player/Home');
    const ids = new Set<string>();
    for (const f of FURNITURE) {
      expect(ids.has(f.id)).toBe(false);
      ids.add(f.id);
      expect(f.price).toBeGreaterThan(0);
      if (f.solid) {
        const [x0, z0, x1, z1] = f.solid;
        expect(x0 >= HOUSE.x0 && x1 <= HOUSE.x1 && z0 >= HOUSE.z0 && z1 <= HOUSE.z1, f.id).toBe(true);
      }
    }
  });

  it('solar means no more NEPA wahala; gen fuel keeps light that day', async () => {
    const { homeDark, newHome } = await import('../src/player/Home');
    const h = { ...newHome(), units: 0 };
    expect(homeDark(h, 3)).toBe(true);
    expect(homeDark({ ...h, furniture: ['gen'], genDay: 3 }, 3)).toBe(false);
    expect(homeDark({ ...h, furniture: ['gen'], genDay: 2 }, 3)).toBe(true);
    expect(homeDark({ ...h, furniture: ['solar'] }, 3)).toBe(false);
  });
});
