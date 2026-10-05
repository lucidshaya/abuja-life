import type { Choice, GameEvent } from './EventSystem';

/**
 * Extra choices that only show for certain roles (see player/Roles.ts).
 * They're added in front of the event's normal choices.
 */
export const ROLE_CHOICES: Record<string, Choice[]> = {
  vio: [
    {
      text: '"Na Distinguished Senator/Minister you dey stop?"',
      requires: { role: ['senator', 'minister'] },
      outcomes: [{ text: 'He see the flag for your car. "Ah! Sorry sir! Safe journey sir!" He even stop traffic for you.', effects: { clout: 3 } }],
    },
    {
      text: '"Corper wee! Abeg sir, na allawee I dey use."',
      requires: { role: ['corper'] },
      outcomes: [{ text: '"Ehen, corper! Go, go. Serve your fatherland well."', effects: { clout: 1 } }],
    },
  ],
  ministry: [
    {
      text: 'Inspect the ministry (you be the Minister)',
      requires: { role: ['minister'] },
      outcomes: [{ text: 'Everybody stand up. Oga suddenly "return from travel". Files dey fly. Your project approved in 10 minutes.', effects: { money: 150000, clout: 5 } }],
    },
    {
      text: 'Show your staff ID: "Colleague, abeg move my file"',
      requires: { role: ['civil'] },
      outcomes: [
        { weight: 2, text: 'Danjuma: "Ah, my oga for Grade Level 08!" Small "logistics" later, your file move.', effects: { money: 50000, clout: 2 } },
        { weight: 1, text: 'Danjuma: "Colleague or no colleague, Oga travel." Even you no fit escape "come back tomorrow".', effects: { timeSkip: 4 } },
      ],
    },
  ],
  'aso-guard': [
    {
      text: 'Show your official ID',
      requires: { role: ['senator', 'minister'] },
      outcomes: [{ text: 'The soldier salute: "Welcome sir! Proceed." You enter the Aso axis like say na your papa house.', effects: { clout: 3 } }],
    },
  ],
  pos: [
    {
      text: 'Talk shop: compare POS charges',
      requires: { role: ['pos'] },
      outcomes: [{ text: '"₦200 per ₦5k? Na the same thing I dey charge!" She send you the customers wey she no fit serve.', effects: { money: 1500, clout: 2 } }],
    },
  ],
  'nile-gate': [
    {
      text: 'Flash your Nile student ID',
      requires: { role: ['student'] },
      outcomes: [{ text: 'Guard: "Oya pass, scholar! No carry over this semester o."', effects: { clout: 1 } }],
    },
  ],
  'nile-lecture': [
    {
      text: 'Answer the question (you read last night)',
      requires: { role: ['student'] },
      outcomes: [{ text: 'Dr. Okafor nod slowly: "Finally. Somebody dey read for this class." Whole class clap.', effects: { timeSkip: 2, clout: 5, flag: 'notes' } }],
    },
  ],
  'nile-caf': [
    {
      text: 'Student discount plate (₦500)',
      requires: { role: ['student'], minMoney: 500 },
      lockedHint: 'Need ₦500',
      outcomes: [{ text: 'Mama Caf add extra meat: "Na my students I dey feed." Belle full!', effects: { money: -500, clout: 1 } }],
    },
  ],
  market: [
    {
      text: 'Trader to trader: collect wholesale price',
      requires: { role: ['trader'], minMoney: 6000 },
      lockedHint: 'Need ₦6,000',
      outcomes: [{ text: 'Mama Nkechi: "Ah, my fellow market person!" She give you the fabric for ₦6k. Aso-ebi secured.', effects: { money: -6000, clout: 2, flag: 'fabric' } }],
    },
  ],
  'cage-bouncer': [
    {
      text: 'VIP entrance (you be big man)',
      requires: { role: ['senator', 'minister', 'techbro'] },
      outcomes: [{ text: 'Big Joe open the rope: "VIP! This way sir." Bottles dey wait for your table already.', effects: { flag: 'cageRegular', clout: 3, teleport: { x: 1423, z: 210, heading: Math.PI } } }],
    },
  ],
  bigman: [
    {
      text: '"Do YOU know who I am? I be the FCT Minister."',
      requires: { role: ['minister'] },
      outcomes: [{ text: 'Chief kneel down for road: "Honourable! Forgive me sir! Abeg remember my land application."', effects: { clout: 6 } }],
    },
  ],
  oneway: [
    {
      text: '"Colleague! Make we share passengers."',
      requires: { role: ['driver'] },
      outcomes: [{ text: 'Danladi laugh: "My guy!" He give you two passengers for Berger. Fuel money don land.', effects: { money: 2000, timeSkip: 1, clout: 1 } }],
    },
  ],
  suya: [
    {
      text: '"Mallam, sadaka don Allah"',
      requires: { role: ['almajiri'] },
      outcomes: [{ text: 'Mallam Musa wrap small suya and tozo for you: "Ka ci, ɗana. Study hard."', effects: { clout: 1, timeSkip: 0.5 } }],
    },
  ],
  'guzape-agent': [
    {
      text: 'Allocate the plot to yourself (as Minister)',
      requires: { role: ['minister'], notFlag: 'landlord' },
      outcomes: [{ text: 'Kola sweat: "Yes sir! C of O ready!" But tomorrow e go trend for Twitter: "Minister allocate land to himself" 😬', effects: { flag: 'landlord', clout: -8 } }],
    },
  ],
};

/** Events with their role-only choices prepended. */
export function withRoleChoices(events: GameEvent[]): GameEvent[] {
  return events.map((e) => (ROLE_CHOICES[e.id] ? { ...e, choices: [...ROLE_CHOICES[e.id], ...e.choices] } : e));
}
