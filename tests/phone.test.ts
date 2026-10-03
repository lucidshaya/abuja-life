import { describe, expect, it } from 'vitest';
import { BILLS, CONTACTS, TRANSFER_FEE, canAfford, groupText, morningText, parsePhone, transferOp, unlockedContacts } from '../src/phone/PhoneData';
import { parseSave, newSave } from '../src/core/Save';

describe('Phone data', () => {
  it('starts with family + taxi contacts and unlocks more through play', () => {
    const start = unlockedContacts(new Set()).map((c) => c.id);
    expect(start).toEqual(expect.arrayContaining(['mummy', 'uncle', 'danladi']));
    expect(start).not.toContain('posbabe');
    expect(unlockedContacts(new Set(['posNumber'])).map((c) => c.id)).toContain('posbabe');
  });

  it('transfers include the fee and earn clout for family', () => {
    const mummy = CONTACTS.find((c) => c.id === 'mummy')!;
    const op = transferOp(mummy, 5000);
    expect(op.amount).toBe(-(5000 + TRANSFER_FEE));
    expect(op.clout).toBeGreaterThan(0);
    expect(op.reply?.text).toBeTruthy();
    expect(canAfford(5010, op)).toBe(true);
    expect(canAfford(5009, op)).toBe(false);
  });

  it('electricity token ends a blackout', () => {
    expect(BILLS.find((b) => b.id === 'nepa')?.endsBlackout).toBe(true);
  });

  it('rotates morning and group texts', () => {
    expect(morningText(1).text).not.toBe(morningText(2).text);
    expect(groupText(3).from).toContain('Wuse');
  });

  it('parses saved phone state defensively', () => {
    const p = parsePhone({ messages: [{ from: 'A', text: 'hi', day: 1, hour: 2, read: false }, { bad: true }], txs: 'nope', wallpaper: 2 });
    expect(p.messages).toHaveLength(1);
    expect(p.txs).toEqual([]);
    expect(p.wallpaper).toBe(2);
    expect(parsePhone(null).messages).toEqual([]);
    const s = newSave();
    s.phone.txs.push({ id: 't', label: 'x', amount: -5, day: 1, hour: 1 });
    expect(parseSave(JSON.stringify(s))!.phone.txs).toHaveLength(1);
  });
});
