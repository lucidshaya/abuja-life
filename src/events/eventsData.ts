import type { GameEvent } from './EventSystem';

/**
 * All the Abuja wahala and enjoyment, as data. Add new events here — the
 * EventSystem picks them up automatically. Lines are mostly Pidgin with
 * plain-English choices so everybody can play.
 */
export const EVENTS: GameEvent[] = [
  {
    id: 'welcome',
    title: 'Welcome to Abuja',
    speaker: 'Uncle Emeka',
    trigger: { type: 'npc', npc: 'uncle', cooldown: 120 },
    lines: ['Ah! You don land! Welcome to Abuja, the Centre of Unity.'],
    variants: {
      abuja: ['Ah! Our own Abuja pikin don return! You still sabi road abi?', 'Abeg no forget us now wey you don hammer.'],
      lagos: ['Lagos person! Welcome to Abuja. Here, road wide and nobody dey rush. Calm down o.', 'No go dey drive like say you dey Third Mainland Bridge.'],
      east: ['My brother! Nnoo! Welcome to Abuja. Business plenty here — just know who to see.'],
      north: ['Sannu da zuwa! Welcome to Abuja. Your people dey everywhere for this town.'],
    },
    choices: [
      {
        text: 'Show me how to waka around',
        outcomes: [{
          text: 'Look for people with yellow "!" for their head and talk to them. The car beside you is yours — enter am and drive enter town. Your flat dey Wuse 2. Check the map anytime.',
          effects: { clout: 1 },
        }],
      },
      { text: 'I sabi Abuja already, Uncle', outcomes: [{ text: 'Uncle laugh: "Okay o, Mr. Know-All. Make Kubwa traffic no humble you."', effects: { clout: 2 } }] },
      {
        text: 'Abeg borrow me small money',
        outcomes: [
          { weight: 1, text: 'Uncle sigh, bring out ₦5,000: "Na transport fare be this o. No go buy suya with am."', effects: { money: 5000 } },
          { weight: 1, text: 'Uncle: "Ehen? You never reach town, you don start? Shey na so una dey do?" He give you nothing.', effects: { clout: -1 } },
        ],
      },
    ],
  },
  {
    id: 'vio',
    title: 'VIO Checkpoint',
    speaker: 'VIO Officer Bature',
    trigger: { type: 'npc', npc: 'vio', cooldown: 240 },
    lines: ['Oga, park! Park well! Where your particulars?', 'Fire extinguisher? C-caution? First aid box? Show me everything.'],
    choices: [
      {
        text: 'Show papers — I get everything',
        outcomes: [
          { weight: 3, text: '"Hmm... everything complete." He look you like say you disappoint am. "Oya go."', effects: { clout: 1 } },
          { weight: 2, text: '"This fire extinguisher don expire since 2019!" ₦10,000 fine.', effects: { money: -10000 } },
        ],
      },
      {
        text: '"Do you know who I am?"',
        requires: { minClout: 30 },
        lockedHint: 'Need 30 clout',
        outcomes: [{ text: 'He check your face... "Ah, sorry sir! Safe journey sir!" He even salute.', effects: { clout: 3 } }],
      },
      {
        text: 'Settle am (₦2,000 "for pure water")',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [{ text: 'He collect am smiling: "My oga! Go well." Your conscience dey look you.', effects: { money: -2000, clout: -2 } }],
      },
      {
        text: 'Zoom off!',
        outcomes: [
          { weight: 1, text: 'You don escape! Your heart dey beat like talking drum.', effects: { clout: 3 } },
          { weight: 1, text: 'Dem block you for the next junction. Impound fee: ₦25,000. Plus long lecture.', effects: { money: -25000, clout: -5, timeSkip: 2 } },
        ],
      },
    ],
  },
  {
    id: 'suya',
    title: 'Suya Joint, Wuse 2',
    speaker: 'Mallam Musa',
    trigger: { type: 'npc', npc: 'suya', hours: [16, 4], cooldown: 90 },
    unavailable: 'Suya never ready o. Come back when sun don go down, my friend.',
    lines: ['Ina kwana! Fresh suya, kilishi, tozo — everything dey!', 'You want am with extra yaji?'],
    choices: [
      {
        text: '₦1,500 suya, extra pepper',
        requires: { minMoney: 1500 },
        lockedHint: 'Need ₦1,500',
        outcomes: [
          { weight: 3, text: 'E sweet die! Your mouth dey burn but your spirit dey dance.', effects: { money: -1500, clout: 1 } },
          { weight: 1, text: 'The pepper don finish you. You dey cry for public. Mallam dey laugh.', effects: { money: -1500, clout: -1 } },
        ],
      },
      {
        text: '₦5,000 "big boy" combo with cold Malt',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'The whole joint hail you: "BIG BOY!" Somebody dey snap you for status.', effects: { money: -5000, clout: 4 } }],
      },
      { text: 'Just greet Mallam', outcomes: [{ text: 'Mallam: "Lafiya lau! Anytime you hungry, I dey here."' }] },
    ],
  },
  {
    id: 'market',
    title: 'Wuse Market',
    speaker: 'Mama Nkechi',
    trigger: { type: 'npc', npc: 'market', hours: [7, 19], cooldown: 150 },
    unavailable: 'Market don close, my dear. Come back tomorrow morning.',
    lines: ['Customer! Come see fine fabric! Ankara, lace, aso-oke — I go do you good price.', 'This one na original Holland wax. ₦20,000 only.'],
    choices: [
      {
        text: 'Haggle hard',
        requires: { minMoney: 12000 },
        lockedHint: 'Need ₦12,000',
        outcomes: [
          { weight: 2, text: 'You price am from ₦20k reach ₦12k. Mama vex but she sell. Aso-ebi fabric secured!', effects: { money: -12000, clout: 2, flag: 'fabric' } },
          { weight: 1, text: 'Mama: "Customer, you wan kill me?" She hiss and turn back. No deal.', effects: { clout: -1 } },
        ],
      },
      {
        text: 'Haggle like Onitsha trader',
        requires: { background: ['east'], minMoney: 8000 },
        lockedHint: 'Only for people from the East',
        outcomes: [{ text: '"Nwanne m!" Una talk Igbo small and the price fall to ₦8k. Mama even add matching gele.', effects: { money: -8000, clout: 3, flag: 'fabric' } }],
      },
      {
        text: 'Pay full price (₦20,000)',
        requires: { minMoney: 20000 },
        lockedHint: 'Need ₦20,000',
        outcomes: [{ text: 'Mama: "My dear customer! God bless you!" She don save your number as "Mugu 2".', effects: { money: -20000, flag: 'fabric' } }],
      },
      { text: 'I just dey look', outcomes: [{ text: 'Mama: "Looking no dey cost money... but e dey cost my time o!"' }] },
    ],
  },
  {
    id: 'owambe',
    title: 'Owambe in Gwarinpa',
    speaker: 'Aunty Funmi',
    trigger: { type: 'npc', npc: 'owambe', hours: [10, 23], cooldown: 240 },
    unavailable: 'The party don end. Canopy people dey pack chairs.',
    lines: ['Ahhh! You come for my 50th birthday! You look fresh!', 'But wait... where your aso-ebi?!'],
    choices: [
      {
        text: 'Spray money on the dance floor (₦10,000)',
        requires: { minMoney: 10000 },
        lockedHint: 'Need ₦10,000',
        outcomes: [{ text: 'DJ don hail you: "Make una clap for our big man!" Na you be the main character now.', effects: { money: -10000, clout: 8 } }],
      },
      {
        text: 'Show off my aso-ebi',
        requires: { outfit: ['asoebi', 'agbada'] },
        lockedHint: 'Wear aso-ebi or agbada',
        outcomes: [{ text: 'Aunty scream with joy! You collect jollof, small chops AND souvenir (plastic bowl with her face).', effects: { clout: 5, money: 2000 } }],
      },
      {
        text: 'I buy the fabric, I go sew am later',
        requires: { flag: 'fabric' },
        lockedHint: 'Buy fabric at Wuse Market',
        outcomes: [{ text: 'Aunty: "Hmm. At least you try. Go sit for back."', effects: { clout: 2 } }],
      },
      {
        text: 'Chop and run',
        outcomes: [
          { weight: 3, text: 'You pack jollof enter nylon. Mission accomplished. Nobody see you.', effects: { clout: -1 } },
          { weight: 2, text: 'Aunty catch you for gate: "You no even greet my husband!" Everybody dey look.', effects: { clout: -5 } },
        ],
      },
    ],
  },
  {
    id: 'ministry',
    title: 'Federal Ministry of Wahala',
    speaker: 'Mr. Danjuma (Clerk)',
    trigger: { type: 'npc', npc: 'ministry', hours: [8, 16], cooldown: 180 },
    unavailable: 'Office don close. Come back tomorrow by 8am. (Na so dem talk yesterday too.)',
    lines: ['Your contract payment? Ehen. The file dey with Oga.', 'Oga travel. Come back tomorrow.'],
    choices: [
      {
        text: 'Okay, I go come back tomorrow',
        outcomes: [
          { weight: 3, text: 'Next day... "Oga never return. Come back tomorrow." The cycle continues.', effects: { timeSkip: 24, clout: -1 } },
          { weight: 1, text: 'MIRACLE! Credit alert: ₦150,000! You dance Shaku Shaku for inside office.', effects: { timeSkip: 24, money: 150000, clout: 4 } },
        ],
      },
      {
        text: 'Call person wey know person',
        requires: { minClout: 20 },
        lockedHint: 'Need 20 clout',
        outcomes: [
          { weight: 4, text: 'Your connect call one Director. The file move like magic. ₦150,000 don land!', effects: { money: 150000, clout: 3 } },
          { weight: 1, text: 'The "connect" collect ₦20k for "logistics" and switch off him phone.', effects: { money: -20000 } },
        ],
      },
      {
        text: 'Sit down and wait patiently',
        outcomes: [{ text: 'You wait 4 hours. You don memorize every crack for the ceiling. Danjuma: "Come back tomorrow."', effects: { timeSkip: 4 } }],
      },
    ],
  },
  {
    id: 'bigman',
    title: 'Do You Know Who I Am?',
    speaker: 'Chief "Do You Know Me"',
    trigger: { type: 'npc', npc: 'bigman', cooldown: 200 },
    lines: ['YOU! Do you know who I am?!', 'You dey stand for my front like say you get title!'],
    choices: [
      { text: 'Sorry sir, I no know you', outcomes: [{ text: 'Chief: "Next time, ask about me!" He enter his Prado and zoom off.', effects: { clout: -1 } }] },
      {
        text: 'Do YOU know who I am?',
        requires: { minClout: 25 },
        lockedHint: 'Need 25 clout',
        outcomes: [{ text: 'Chief look you well... "Ahn ahn, na you?! Abeg no vex." He dash you ₦5k for "fuel".', effects: { clout: 6, money: 5000 } }],
      },
      {
        text: 'Hail am: "Chairman! Odogwu! Ebube Dike!"',
        outcomes: [
          { weight: 3, text: 'Chief laugh, peel ₦10k from bundle: "This one get sense!"', effects: { money: 10000, clout: 1 } },
          { weight: 2, text: 'Chief: "Flattery no dey pay bills." He waka go.' },
        ],
      },
    ],
  },
  {
    id: 'preacher',
    title: 'Area 1 Crusade',
    speaker: 'Evangelist Joshua',
    trigger: { type: 'npc', npc: 'pastor', cooldown: 150 },
    lines: ['REPENT! Area 1 traffic na sign of end time!', 'Sow a seed of ₦1,000 and your road go clear!'],
    choices: [
      {
        text: 'Sow seed (₦1,000)',
        requires: { minMoney: 1000 },
        lockedHint: 'Need ₦1,000',
        outcomes: [
          { weight: 1, text: '"Amen!" You feel blessed. For 30 seconds, nobody honk you.', effects: { money: -1000, clout: 1 } },
          { weight: 1, text: 'Next minute, you see ₦5,000 for ground. TESTIMONY!', effects: { money: 4000, clout: 1 } },
        ],
      },
      { text: 'Shout "AMEN!" and waka', outcomes: [{ text: 'Your "Amen" loud pass him speaker. He nod with respect.' }] },
      { text: 'Ask for directions', outcomes: [{ text: 'He point everywhere: "All roads lead to Heaven... and Wuse Market."' }] },
    ],
  },
  {
    id: 'jabi-boat',
    title: 'Jabi Lake',
    speaker: 'Baba Boat',
    trigger: { type: 'npc', npc: 'boat', hours: [7, 20], cooldown: 200 },
    unavailable: 'Night don fall. Boat dey sleep. Come back tomorrow.',
    lines: ['Boat ride round Jabi Lake! ₦3,000 only.', 'Life jacket dey... somewhere.'],
    choices: [
      {
        text: 'Take the ride (₦3,000)',
        requires: { minMoney: 3000 },
        lockedHint: 'Need ₦3,000',
        outcomes: [
          { weight: 4, text: 'Breeze, sunset, peace of mind. Abuja sweet die.', effects: { money: -3000, clout: 2, timeSkip: 1 } },
          { weight: 1, text: 'Engine knock for middle of the lake. You paddle back with your hand. Shirt soak.', effects: { money: -3000, clout: -1, timeSkip: 1 } },
        ],
      },
      { text: 'Snap picture for IG', outcomes: [{ text: 'Your picture don get 200 likes. Influencer loading...', effects: { clout: 3 } }] },
      { text: 'No thanks, Baba', outcomes: [{ text: 'Baba: "Your loss. Na me be Captain Jack Sparrow of Jabi."' }] },
    ],
  },
  {
    id: 'oneway',
    title: 'One-Way Taxi',
    speaker: 'Danladi',
    trigger: { type: 'npc', npc: 'oneway', cooldown: 30 },
    lines: ['One-way! Wuse! Berger! Area 1! Enter make we go!'],
    choices: [
      {
        text: 'Wuse 2 (₦1,500)',
        requires: { minMoney: 1500 },
        lockedHint: 'Need ₦1,500',
        outcomes: [{ text: 'Danladi drive like Formula 1. You reach Wuse in 5 minutes. Your soul reach after.', effects: { money: -1500, timeSkip: 0.5, teleport: { x: 10, z: -12, heading: 0 } } }],
      },
      {
        text: 'Area 1 (₦1,500)',
        requires: { minMoney: 1500 },
        lockedHint: 'Need ₦1,500',
        outcomes: [{ text: 'Three passengers for back seat, two for front. You reach Area 1, small squeezed.', effects: { money: -1500, timeSkip: 0.5, teleport: { x: 40, z: 210, heading: Math.PI } } }],
      },
      {
        text: 'Price am down to ₦800',
        outcomes: [
          { weight: 1, text: 'He hiss: "Oga, fuel na ₦1,200 per litre!" He zoom off without you.' },
          { weight: 1, text: '"Oya enter, but you go sit for middle." You reach Wuse 2 with stiff neck.', effects: { money: -800, timeSkip: 0.5, teleport: { x: 10, z: -12, heading: 0 } } },
        ],
      },
    ],
  },
  {
    id: 'aso-guard',
    title: 'Checkpoint',
    speaker: 'Soldier',
    trigger: { type: 'npc', npc: 'guard', cooldown: 20 },
    lines: ['HALT! Where you dey go?', 'This na Aso Rock axis. Turn back immediately!'],
    choices: [
      { text: 'Turn back sharp sharp', outcomes: [{ text: 'Correct decision. You don live to see another day.', effects: { teleport: { x: 330, z: -238, heading: -Math.PI / 2 } } }] },
      {
        text: 'Say you get appointment with Oga',
        outcomes: [
          { weight: 6, text: '"Frog jump go back!" You turn back with small dignity.', effects: { clout: -2, teleport: { x: 330, z: -238, heading: -Math.PI / 2 } } },
          { weight: 1, text: 'Mistaken identity! He salute you. You still turn back because fear catch you.', effects: { clout: 4, teleport: { x: 330, z: -238, heading: -Math.PI / 2 } } },
        ],
      },
    ],
  },
  {
    id: 'pos',
    title: 'POS Stand',
    speaker: 'POS Babe',
    trigger: { type: 'npc', npc: 'pos', cooldown: 120 },
    lines: ['Withdrawal, transfer, airtime, data — everything dey!', 'Network dey... sometimes.'],
    choices: [
      {
        text: 'Buy data (₦1,000)',
        requires: { minMoney: 1000 },
        lockedHint: 'Need ₦1,000',
        outcomes: [{ text: 'Data don enter. You fit post status now. Life is back.', effects: { money: -1000, clout: 1 } }],
      },
      {
        text: 'Ask am out',
        requires: { notFlag: 'posNumber' },
        lockedHint: 'You already get her number',
        outcomes: [
          { weight: 1, text: 'She smile: "Call me after I close." She write her number for your hand.', effects: { clout: 5, flag: 'posNumber' } },
          { weight: 2, text: 'She point at the sign: "NO CREDIT. NO TOASTING." Everybody for queue laugh.', effects: { clout: -1 } },
        ],
      },
      { text: 'Complain: "This network sef!"', outcomes: [{ text: 'Una curse the network together. Bonding moment.', effects: { clout: 1 } }] },
    ],
  },
  {
    id: 'gateman',
    title: 'Home Sweet Home',
    speaker: 'Gateman Sule',
    trigger: { type: 'npc', npc: 'gateman', cooldown: 5 },
    lines: ['Welcome back! NEPA take light since morning o.', 'Wetin you want make I do?'],
    choices: [
      { text: 'Enter house and change clothes', outcomes: [{ text: 'You enter your room and open wardrobe...', effects: { customize: true } }] },
      { text: 'Sleep till morning', outcomes: [{ text: 'You sleep like baby. Mosquito sing you lullaby all night.', effects: { sleep: true } }] },
      {
        text: 'On the gen (₦2,000 fuel)',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [{ text: 'Gen don roar. Fan dey blow. Neighbours dey vex. Life is good.', effects: { money: -2000, clout: 1 } }],
      },
    ],
  },
  {
    id: 'kubwa-jam',
    title: 'Kubwa Expressway Hold-Up',
    speaker: 'Radio Presenter',
    trigger: { type: 'zone', district: 'kubwa', inCar: true, hours: [6, 10], cooldown: 600 },
    lines: ['"Good morning Abuja! Kubwa expressway is... standing still. Again."', 'You don dey this hold-up for 40 minutes. Hawker dey knock your window.'],
    choices: [
      {
        text: 'Wait and buy Gala + LaCasera (₦700)',
        outcomes: [{ text: 'One hour later, you don move 200 metres. The Gala sweet sha.', effects: { money: -700, timeSkip: 1 } }],
      },
      {
        text: 'Follow "one-way" against traffic',
        outcomes: [
          { weight: 1, text: 'Shortcut work! Ten cars dey follow you like say you be convoy.', effects: { clout: 3 } },
          { weight: 1, text: 'FRSC catch you! ₦20,000 fine and one hour lecture on road safety.', effects: { money: -20000, clout: -3, timeSkip: 1 } },
        ],
      },
      { text: 'Play Fuji music and vibe', outcomes: [{ text: 'K1 De Ultimate dey blast. The traffic no matter again.', effects: { clout: 1, timeSkip: 1 } }] },
    ],
  },
  {
    id: 'nepa',
    title: 'Light Don Go!',
    speaker: 'The Whole Street',
    trigger: { type: 'random', hours: [19, 5], chance: 0.3, cooldown: 420 },
    lines: ['NEPAAAA!!! Light don go!', 'The whole area dark like inside goat stomach.'],
    choices: [
      { text: 'Shout "NEPA!" with everybody', outcomes: [{ text: 'The whole street shout am together. Na Naija unity be this.', effects: { blackout: 40 } }] },
      {
        text: 'Wait small...',
        outcomes: [
          { weight: 1, text: 'UP NEPA!!! Light don come back! The area celebrate like Super Eagles score.', effects: { blackout: 4 } },
          { weight: 2, text: 'Hmm. E no come back. Gen sound dey everywhere now.', effects: { blackout: 50 } },
        ],
      },
    ],
  },
  {
    id: 'mummy',
    title: 'Incoming Call: Mummy ❤️',
    speaker: 'Mummy (on phone)',
    trigger: { type: 'random', chance: 0.12, cooldown: 900 },
    lines: ['Hello my child! You don chop?', 'When you go marry? Your mate Ngozi don get three children!'],
    choices: [
      {
        text: 'Send Mummy ₦5,000',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'Mummy: "God bless you! You go marry this year, in Jesus name!"', effects: { money: -5000, clout: 3 } }],
      },
      { text: '"Mummy, network bad... hello? Hello?"', outcomes: [{ text: 'You hang up. Guilt dey your chest small.', effects: { clout: -1 } }] },
      { text: 'Tell her you dey hustle', outcomes: [{ text: 'Mummy: "Make sure say na legit money o! I dey pray for you."' }] },
    ],
  },
  {
    id: 'fuel',
    title: 'Fuel Scarcity',
    speaker: 'Filling Station Attendant',
    trigger: { type: 'random', hours: [6, 21], inCar: true, chance: 0.1, cooldown: 900 },
    lines: ['Fuel scarcity don land again!', 'The queue for filling station long reach the next junction.'],
    choices: [
      {
        text: 'Join the queue',
        requires: { minMoney: 8000 },
        lockedHint: 'Need ₦8,000',
        outcomes: [{ text: 'Two hours later, tank full. You feel like you win AFCON.', effects: { money: -8000, timeSkip: 2 } }],
      },
      {
        text: 'Buy black market jerrycan (₦15,000)',
        requires: { minMoney: 15000 },
        lockedHint: 'Need ₦15,000',
        outcomes: [{ text: 'Expensive, but you dey move while others dey queue.', effects: { money: -15000, clout: 1 } }],
      },
      {
        text: 'Pray say the fuel reach',
        outcomes: [
          { weight: 1, text: 'E reach! The fuel light don dey blink since Tuesday but God dey.' },
          { weight: 1, text: 'Car begin cough for Berger... You push am reach filling station. Sweat everywhere.', effects: { clout: -2, timeSkip: 1 } },
        ],
      },
    ],
  },
];
