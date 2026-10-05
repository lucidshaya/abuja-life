import type { GameEvent } from './EventSystem';

/**
 * Your estate and the waza hustle. The front door, meter, estate office and
 * waza plug open custom dialogues in Game (they show live numbers); these
 * entries keep the NPC markers and cooldowns working.
 */
export const HOME_EVENTS: GameEvent[] = [
  {
    id: 'estate-gate',
    title: 'Sunshine Court Estate',
    speaker: 'Estate Security (Baba Audu)',
    trigger: { type: 'npc', npc: 'estate-gate', cooldown: 60 },
    lines: ['Oga/Madam, welcome back! Everything dey calm for estate today.', 'Abeg remember say service charge dey due every Monday o.'],
    choices: [
      {
        text: 'Dash am ₦500 for pure water',
        requires: { minMoney: 500 },
        lockedHint: 'Need ₦500',
        outcomes: [{ text: 'Baba Audu salute: "Thank you sir! Nobody go touch your car tonight."', effects: { money: -500, clout: 1 } }],
      },
      { text: 'Any gist for estate?', outcomes: [
        { weight: 1, text: '"The people for No. 4 dey fight again. And Mrs. Okon say she go disconnect anybody wey no pay service charge."' },
        { weight: 1, text: '"Water tanker go come tomorrow. Make sure your tank dey open."' },
      ] },
      { text: 'Greet am and pass', outcomes: [{ text: '"Safe! God go bless your going out and coming in."' }] },
    ],
  },
  {
    id: 'estate-office',
    title: 'Estate Office',
    speaker: 'Estate Manager Mrs. Okon',
    trigger: { type: 'npc', npc: 'estate-manager', cooldown: 5 },
    lines: ['Good day. Service charge na ₦10,000 every week: security, waste and street light.'],
    choices: [{ text: 'Okay ma', outcomes: [{ text: '"Thank you. Pay on time o."' }] }],
  },
  {
    id: 'estate-home',
    title: 'Home Sweet Home',
    speaker: 'Your house',
    trigger: { type: 'npc', npc: 'estate-door', cooldown: 5 },
    lines: ['You open your front door.'],
    choices: [{ text: 'Rest small', outcomes: [{ text: 'You rest small.', effects: { timeSkip: 1 } }] }],
  },
  {
    id: 'estate-meter',
    title: 'Prepaid Meter',
    speaker: 'AEDC Meter',
    trigger: { type: 'npc', npc: 'estate-meter', cooldown: 5 },
    lines: ['The meter dey blink.'],
    choices: [{ text: 'Check units', outcomes: [{ text: 'You check the units.' }] }],
  },
  {
    id: 'waza-plug',
    title: 'Waza Plug',
    speaker: 'Waza Plug (Banex)',
    trigger: { type: 'npc', npc: 'waza-plug', cooldown: 5 },
    lines: ['My guy! Waza dey: mint, watermelon, grape, any flavour.'],
    choices: [{ text: 'Check stock', outcomes: [{ text: 'He show you the carton.' }] }],
  },
];
