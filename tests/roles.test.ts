import { describe, expect, it } from 'vitest';
import { newSave, parseSave } from '../src/core/Save';
import { meets, type EventContext } from '../src/events/EventSystem';
import { EVENTS } from '../src/events/eventsData';
import { ROLE_CHOICES, withRoleChoices } from '../src/events/roleChoices';
import { EMOTES } from '../src/player/Character';
import { CLOTH_COLORS, OPTIONS, upgradeCharacter } from '../src/player/CharacterConfig';
import { ROLES, playerEmail, roleById } from '../src/player/Roles';
import { CONTACTS, requestReply } from '../src/phone/PhoneData';
import { NPC_SPOTS, WORLD, inRect } from '../src/world/MapData';
import { QUICK_ZONES, quickZoneAt } from '../src/world/locations/QuickPlaces';

const ctx = (over: Partial<EventContext> = {}): EventContext => ({
  district: 'wuse', hour: 12, inCar: false, outfit: 'kaftan', background: 'abuja',
  stats: { money: 50000, clout: 0 }, flags: new Set(), role: null, ...over,
});

describe('roles', () => {
  it('has the 10 Abuja roles with valid data', () => {
    expect(ROLES.map((r) => r.id)).toEqual(['almajiri', 'student', 'corper', 'pos', 'driver', 'trader', 'civil', 'techbro', 'senator', 'minister']);
    const outfits = OPTIONS.outfit.map((o) => o.id as string);
    for (const r of ROLES) {
      expect(r.money).toBeGreaterThan(0);
      expect(r.work.pay[1]).toBeGreaterThanOrEqual(r.work.pay[0]);
      expect(r.work.lines.length).toBeGreaterThan(0);
      if (r.look.outfit) expect(outfits).toContain(r.look.outfit);
      if (r.look.primary !== undefined) expect(r.look.primary).toBeLessThan(CLOTH_COLORS.length);
      expect(inRect(WORLD, r.workplace.x, r.workplace.z), r.id).toBe(true);
      expect(r.salary === 0 || r.salaryFrom.length > 0, r.id).toBe(true);
    }
    expect(roleById('minister')?.money).toBeGreaterThan(roleById('almajiri')!.money);
    expect(roleById('nope')).toBeNull();
  });

  it('builds a player email address', () => {
    expect(playerEmail('Chidi O.', roleById('minister'))).toBe('chidio@fcta.gov.abujalife.ng');
    expect(playerEmail('', null)).toBe('player@abujalife.ng');
  });

  it('gates choices by role', () => {
    expect(meets({ role: ['senator'] }, ctx({ role: 'senator' }))).toBe(true);
    expect(meets({ role: ['senator'] }, ctx({ role: 'student' }))).toBe(false);
    expect(meets({ role: ['senator'] }, ctx())).toBe(false);
  });

  it('role choices attach to real events', () => {
    const ids = new Set(EVENTS.map((e) => e.id));
    for (const id of Object.keys(ROLE_CHOICES)) expect(ids.has(id), id).toBe(true);
    const merged = withRoleChoices(EVENTS);
    const ministry = merged.find((e) => e.id === 'ministry')!;
    expect(ministry.choices.length).toBe(EVENTS.find((e) => e.id === 'ministry')!.choices.length + ROLE_CHOICES.ministry.length);
    for (const list of Object.values(ROLE_CHOICES)) for (const c of list) expect(c.requires?.role?.length).toBeGreaterThan(0);
  });
});

describe('save: roles & mail', () => {
  it('defaults and round-trips role, salary day and mail', () => {
    const s = newSave();
    expect(s.role).toBeNull();
    s.role = 'techbro';
    s.lastSalaryDay = 4;
    s.phone.mail.push({ id: 'e1', from: 'Startup', subject: 'Hi', body: 'Welcome', day: 1, hour: 9, read: false });
    const back = parseSave(JSON.stringify(s))!;
    expect(back.role).toBe('techbro');
    expect(back.lastSalaryDay).toBe(4);
    expect(back.phone.mail[0].subject).toBe('Hi');
  });

  it('upgrades old saves without new character fields', () => {
    const old = JSON.stringify({ version: 1, character: { name: 'Ada', outfit: 'ankara', skin: 12 } });
    const s = parseSave(old)!;
    expect(s.role).toBeNull();
    expect(s.phone.mail).toEqual([]);
    expect(s.character.shoes).toBeDefined();
    expect(s.character.skin).toBeLessThan(8);
    expect(upgradeCharacter({}).name).toBeTruthy();
  });
});

describe('money: request replies', () => {
  it('gives the asked amount or a part, or says no', () => {
    const mummy = CONTACTS.find((c) => c.id === 'mummy')!;
    const yes = requestReply(mummy, 1000, () => 0);
    expect(yes.give).toBe(1000);
    const no = requestReply(mummy, 1000, () => 0.99);
    expect(no.give).toBe(0);
    expect(no.text.length).toBeGreaterThan(0);
  });
});

describe('quick actions', () => {
  it('npc items point at real NPC spots and sit close to them', () => {
    for (const z of QUICK_ZONES) for (const it of z.items) {
      if (!it.npc) continue;
      const s = NPC_SPOTS.find((n) => n.id === it.npc);
      expect(s, it.npc).toBeDefined();
      expect(Math.hypot(s!.x - it.x, s!.z - it.z), it.label).toBeLessThan(3.6);
    }
  });

  it('finds the zone you stand in', () => {
    expect(quickZoneAt(QUICK_ZONES, -470, 60)?.id).toBe('nile');
    expect(quickZoneAt(QUICK_ZONES, 1620, 0)?.id).toBe('nile');
    expect(quickZoneAt(QUICK_ZONES, 1470, 0)?.id).toBe('mall-in');
    expect(quickZoneAt(QUICK_ZONES, 250, -250)?.id).toBe('park');
    expect(quickZoneAt(QUICK_ZONES, -700, -236)).toBeNull();
  });
});

describe('emotes', () => {
  it('has the Naija TikTok dances', () => {
    expect(EMOTES.map((e) => e.name.toLowerCase()).join(' ')).toMatch(/egwu.*step.*shaku.*zanku.*buga/);
  });
});
