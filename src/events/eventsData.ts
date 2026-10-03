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

  // ======================= JABI LAKE MALL =======================
  {
    id: 'mall-security',
    title: 'Mall Entrance',
    speaker: 'Mall Security',
    trigger: { type: 'npc', npc: 'mallguard', cooldown: 120 },
    lines: ['Good day! Open your bag. Walk through the detector one by one.'],
    choices: [
      { text: 'Open bag, nothing to hide', outcomes: [{ text: 'BEEP! Na your belt buckle. Guard: "Oya pass, enjoy your shopping."' }] },
      {
        text: '"Do you know who I am?"',
        requires: { minClout: 40 },
        lockedHint: 'Need 40 clout',
        outcomes: [{ text: 'Guard recognise you: "Ah! Celebrity! Abeg snap with me first."', effects: { clout: 3 } }],
      },
      { text: 'Ask if the AC dey work', outcomes: [{ text: 'Guard: "AC dey work since 2019... small small. Na fan we dey use now."' }] },
    ],
  },
  {
    id: 'mall-checkout',
    title: 'ShopRight Checkout',
    speaker: 'Cashier Blessing',
    trigger: { type: 'npc', npc: 'cashier', hours: [8, 22], cooldown: 90 },
    unavailable: 'Till don close. Come back tomorrow by 8am.',
    lines: ['Next customer! You get loyalty card?', 'Make una no rush me o, this machine dey slow today.'],
    choices: [
      {
        text: 'Buy foodstuff for the month (₦18,000)',
        requires: { minMoney: 18000 },
        lockedHint: 'Need ₦18,000',
        outcomes: [{ text: 'Rice, Indomie, tin tomato, milk, Maggi. Your fridge go happy for once.', effects: { money: -18000, clout: 2 } }],
      },
      {
        text: 'Just Indomie and egg (₦3,500)',
        requires: { minMoney: 3500 },
        lockedHint: 'Need ₦3,500',
        outcomes: [{ text: 'Student starter pack. Cashier nod with respect.', effects: { money: -3500 } }],
      },
      { text: 'Ask for your ₦50 change', outcomes: [{ text: 'Cashier: "No change. Collect sweet." She give you three Tom-Tom.' }] },
    ],
  },
  {
    id: 'mall-water',
    title: 'Bottled Water',
    speaker: 'Pallets of water',
    trigger: { type: 'npc', npc: 'water', cooldown: 60 },
    lines: ['Pallets of table water stacked high. Abuja heat no be joke.'],
    choices: [
      {
        text: 'Buy a pack of water (₦2,500)',
        requires: { minMoney: 2500 },
        lockedHint: 'Need ₦2,500',
        outcomes: [{ text: 'You drink two bottles before you reach the till. Hydrated king/queen.', effects: { money: -2500, clout: 1 } }],
      },
      {
        text: 'Carry two packs to show strength (₦5,000)',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [
          { weight: 2, text: 'Everybody see your muscle. One aunty clap for you.', effects: { money: -5000, clout: 3 } },
          { weight: 1, text: 'One pack burst. Water everywhere. Cleaner dey look you anyhow.', effects: { money: -5000, clout: -2 } },
        ],
      },
      { text: 'Stand by the fridge for free AC', outcomes: [{ text: 'You stand there for 10 minutes. Best part of your day.' }] },
    ],
  },
  {
    id: 'mall-promo',
    title: 'Free Tasting',
    speaker: 'Promo Girl',
    trigger: { type: 'npc', npc: 'promo', cooldown: 120 },
    lines: ['Taste our new yoghurt! Free! Free! Strawberry and coconut!'],
    choices: [
      { text: 'Taste am (free)', outcomes: [{ text: 'E sweet! You collect three more "samples". She don dey look you.' }] },
      {
        text: 'Taste and buy a pack (₦1,500)',
        requires: { minMoney: 1500 },
        lockedHint: 'Need ₦1,500',
        outcomes: [{ text: 'She smile: "Thank you! Come back tomorrow, new flavour dey come."', effects: { money: -1500, clout: 1 } }],
      },
      {
        text: 'Ask for her number',
        outcomes: [
          { weight: 1, text: 'She write am for the yoghurt cup. Victory!', effects: { clout: 4 } },
          { weight: 2, text: 'She lift her hand: wedding ring. "My husband dey aisle 3."', effects: { clout: -1 } },
        ],
      },
    ],
  },
  {
    id: 'mall-food',
    title: 'Food Court',
    speaker: 'Jollof Junction',
    trigger: { type: 'npc', npc: 'food', hours: [10, 22], cooldown: 120 },
    unavailable: 'Kitchen never open. Pot dey wash. Come back by 10.',
    lines: ['Welcome to Jollof Junction! Party jollof, fried rice, chicken, plantain!'],
    choices: [
      {
        text: 'Jollof + chicken + dodo (₦4,500)',
        requires: { minMoney: 4500 },
        lockedHint: 'Need ₦4,500',
        outcomes: [{ text: 'Smoky party jollof. You close your eyes and see your ancestors.', effects: { money: -4500, clout: 2, timeSkip: 0.5 } }],
      },
      {
        text: 'Shawarma, extra sausage (₦3,000)',
        requires: { minMoney: 3000 },
        lockedHint: 'Need ₦3,000',
        outcomes: [{ text: 'The shawarma big like your future. You no fit finish am.', effects: { money: -3000, timeSkip: 0.5 } }],
      },
      {
        text: 'Argue say Ghana jollof better',
        outcomes: [
          { weight: 2, text: 'The whole food court turn look you. Security dey come your side.', effects: { clout: -4 } },
          { weight: 1, text: 'One Ghanaian customer hail you. You don get new friend.', effects: { clout: 2 } },
        ],
      },
    ],
  },
  {
    id: 'mall-cinema',
    title: 'Lakeside Cinemas',
    speaker: 'Ticket Counter',
    trigger: { type: 'npc', npc: 'cinema', hours: [10, 24], cooldown: 180 },
    unavailable: 'First show na 10am. Come back.',
    lines: ['Now showing: "Wahala in Wuse" (Nollywood blockbuster) and "Fast 15".', 'Popcorn combo dey too.'],
    choices: [
      {
        text: 'Watch the Nollywood movie (₦4,000)',
        requires: { minMoney: 4000 },
        lockedHint: 'Need ₦4,000',
        outcomes: [{ text: 'Three plot twists, one ghost and a village meeting. Classic!', effects: { money: -4000, clout: 2, timeSkip: 2 } }],
      },
      {
        text: 'Watch Fast 15 (₦5,000)',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'Cars fly. Family is everything. You wan drift for Area 1 now.', effects: { money: -5000, clout: 2, timeSkip: 2 } }],
      },
      {
        text: 'Buy popcorn only (₦2,000)',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [{ text: 'You eat popcorn for the lobby like say you dey watch life.', effects: { money: -2000 } }],
      },
      { text: 'Just look at the posters', outcomes: [{ text: '"Coming soon: Kubwa Traffic — The Movie (4 hours long)."' }] },
    ],
  },
  {
    id: 'mall-phone',
    title: 'Gadget Palace',
    speaker: 'Phone Seller',
    trigger: { type: 'npc', npc: 'phone', cooldown: 150 },
    lines: ['Original! UK-used! Brand new! Which one you want?', 'I fit do you good price, my person.'],
    choices: [
      {
        text: 'Buy a new phone (₦120,000)',
        requires: { minMoney: 120000 },
        lockedHint: 'Need ₦120,000',
        outcomes: [{ text: 'New phone, new you. Your status don dey show in HD.', effects: { money: -120000, clout: 10 } }],
      },
      {
        text: 'Fix your cracked screen (₦15,000)',
        requires: { minMoney: 15000 },
        lockedHint: 'Need ₦15,000',
        outcomes: [{ text: 'Screen fresh like new. You fit see your messages again.', effects: { money: -15000, clout: 2 } }],
      },
      { text: 'Just dey price', outcomes: [{ text: '"Customer, last price... ₦5k off. Final. Okay ₦7k. My oga go kill me."' }] },
    ],
  },
  // ======================= NILE UNIVERSITY =======================
  {
    id: 'nile-gate',
    title: 'University Gate',
    speaker: 'Campus Security',
    trigger: { type: 'npc', npc: 'uniguard', cooldown: 120 },
    lines: ['Stop there! ID card? Visitors must sign the book.'],
    choices: [
      { text: 'Sign the visitors book', outcomes: [{ text: 'Name: you. Purpose of visit: "to hammer". Guard: "Oya pass."' }] },
      { text: '"Sir, I be fresher, abeg"', outcomes: [{ text: 'Guard laugh: "Fresher! Welcome. Go Senate building go register."', effects: { flag: 'student', clout: 1 } }] },
      {
        text: 'Give am ₦500 for pure water',
        requires: { minMoney: 500 },
        lockedHint: 'Need ₦500',
        outcomes: [{ text: 'Guard: "My guy! You fit come anytime."', effects: { money: -500, clout: 1 } }],
      },
    ],
  },
  {
    id: 'nile-lecture',
    title: 'Lecture Theatre 1',
    speaker: 'Dr. Okafor',
    trigger: { type: 'npc', npc: 'lecturer', hours: [8, 18], cooldown: 240 },
    unavailable: 'Lecture don end. Dr. Okafor don go department meeting.',
    lines: ["You're late. Sit down.", "Today's topic: Thermodynamics of Jollof Rice, Part 2. This WILL come out in exam."],
    choices: [
      { text: 'Pay attention and take notes', outcomes: [{ text: 'You understand everything. For once. Your course mates go beg for your notes.', effects: { timeSkip: 2, clout: 3, flag: 'notes' } }] },
      {
        text: 'Sleep for back row',
        outcomes: [
          { weight: 1, text: 'Nobody notice. Best sleep of your life.', effects: { timeSkip: 2 } },
          { weight: 1, text: '"YOU! Back there! Come and solve this on the board!" Disgrace for the whole class to see.', effects: { timeSkip: 2, clout: -3 } },
        ],
      },
      { text: '"Sir, will this come out in exam?"', outcomes: [{ text: 'Dr. Okafor: "Everything will come out in exam." The whole class groan.' }] },
    ],
  },
  {
    id: 'nile-library',
    title: 'University Library',
    speaker: 'Librarian',
    trigger: { type: 'npc', npc: 'librarian', hours: [8, 22], cooldown: 180 },
    unavailable: 'Library don close. Read for your room.',
    lines: ['Shhh! Library rules: no noise, no food, no sleeping on the books.'],
    choices: [
      { text: 'Read for exams (2 hours)', outcomes: [{ text: 'You read like say your life depend on am. E actually depend on am.', effects: { timeSkip: 2, clout: 2, flag: 'notes' } }] },
      { text: 'Use the free WiFi', outcomes: [{ text: 'Download speed: 2kb/s. You watch one TikTok in 40 minutes.', effects: { timeSkip: 0.7 } }] },
      {
        text: 'Sneak in small chops',
        outcomes: [
          { weight: 1, text: 'Successful mission. Puff-puff for inside library. Legend.', effects: { clout: 2 } },
          { weight: 1, text: 'Librarian catch you: "OUT!" Everybody look you as you dey waka.', effects: { clout: -3 } },
        ],
      },
    ],
  },
  {
    id: 'nile-caf',
    title: 'Mama Caf',
    speaker: 'Mama Caf',
    trigger: { type: 'npc', npc: 'cafmama', hours: [7, 21], cooldown: 120 },
    unavailable: 'Mama don pack. Pot don empty. Come tomorrow.',
    lines: ['My pikin! Rice and beans with fish, ₦1,500. Swallow dey too.'],
    choices: [
      {
        text: 'Rice and beans + fish (₦1,500)',
        requires: { minMoney: 1500 },
        lockedHint: 'Need ₦1,500',
        outcomes: [{ text: 'Mama add extra pomo because she like your face.', effects: { money: -1500, clout: 1 } }],
      },
      {
        text: 'Beg for student discount',
        outcomes: [
          { weight: 1, text: 'Mama smile: "Oya ₦1,000. Study hard o."', effects: { money: -1000, clout: 1 } },
          { weight: 1, text: 'Mama: "Discount na your papa get am?"' },
        ],
      },
      {
        text: 'Eat on credit',
        requires: { notFlag: 'cafDebt' },
        lockedHint: 'You already owe Mama',
        outcomes: [{ text: 'Mama write your name for her black book. Your name don dey there with 40 other people.', effects: { flag: 'cafDebt' } }],
      },
    ],
  },
  {
    id: 'nile-football',
    title: 'Faculty Cup',
    speaker: 'Team Captain Tunde',
    trigger: { type: 'npc', npc: 'captain', hours: [7, 19], cooldown: 240 },
    unavailable: 'Too dark to play. Floodlight no dey work since 2015.',
    lines: ['We need one more player! Law vs Engineering. Winner take bragging rights.', 'You fit play?'],
    choices: [
      {
        text: 'Play striker',
        outcomes: [
          { weight: 1, text: 'You score the winning goal! The whole pitch carry you for shoulder.', effects: { clout: 6, timeSkip: 1.5 } },
          { weight: 1, text: 'You miss open goal. Dem go talk am till graduation.', effects: { clout: -3, timeSkip: 1.5 } },
        ],
      },
      {
        text: 'Play goalkeeper',
        outcomes: [
          { weight: 1, text: 'You save penalty! Engineering students dey cry.', effects: { clout: 5, timeSkip: 1.5 } },
          { weight: 1, text: 'Ball pass under your leg. Twice.', effects: { clout: -2, timeSkip: 1.5 } },
        ],
      },
      { text: 'Just watch and cheer', outcomes: [{ text: 'You shout "GOAL!" for the wrong team. Nobody notice.', effects: { clout: 1, timeSkip: 1 } }] },
    ],
  },
  {
    id: 'nile-sug',
    title: 'SUG Campaign',
    speaker: 'SUG Candidate',
    trigger: { type: 'npc', npc: 'sug', cooldown: 180 },
    lines: ['Vote for me for SUG President!', 'Free WiFi, constant light, and jollof every Friday!'],
    choices: [
      { text: 'Promise your vote', outcomes: [{ text: 'He dash you branded biro and ₦2,000 "transport".', effects: { money: 2000, clout: 1 } }] },
      { text: 'Ask how he go do am', outcomes: [{ text: 'Candidate: "Next question."' }] },
      {
        text: 'Run against am',
        requires: { minClout: 30 },
        lockedHint: 'Need 30 clout',
        outcomes: [{ text: 'Your campaign trend on campus! You win SUG President! First policy: longer caf hours.', effects: { clout: 10, flag: 'sugPresident' } }],
      },
    ],
  },
  // ======================= MILLENNIUM PARK =======================
  {
    id: 'park-photo',
    title: 'Snap Picture',
    speaker: 'Park Photographer',
    trigger: { type: 'npc', npc: 'photographer', hours: [7, 19], cooldown: 120 },
    unavailable: 'Light don go. My camera no dey see for dark.',
    lines: ['Snap picture! ₦2,000 for four copies.', 'I go make you look like celebrity.'],
    choices: [
      {
        text: 'Snap by the gate (₦2,000)',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [{ text: 'Fine picture! You post am: "Abuja vibes only."', effects: { money: -2000, clout: 3 } }],
      },
      {
        text: 'Snap with the fountain (₦3,500)',
        requires: { minMoney: 3500 },
        lockedHint: 'Need ₦3,500',
        outcomes: [{ text: 'Water splash, sun shine, angle correct. 500 likes in one hour.', effects: { money: -3500, clout: 5 } }],
      },
      { text: 'No thanks', outcomes: [{ text: 'Photographer: "Your face don fine already sha."' }] },
    ],
  },
  {
    id: 'park-wedding',
    title: 'Pre-wedding Shoot',
    speaker: 'The Couple',
    trigger: { type: 'npc', npc: 'groom', hours: [8, 19], cooldown: 200 },
    unavailable: 'The couple don pack go. Light no good again.',
    lines: ['Groom: "Abeg, we dey shoot our pre-wedding pictures!"', 'Bride: "Fit help us hold the reflector small?"'],
    choices: [
      { text: 'Help them', outcomes: [{ text: 'Bride give you small chops and IV card. You don become wedding committee.', effects: { clout: 3, money: 1000 } }] },
      {
        text: 'Photobomb the picture',
        outcomes: [
          { weight: 1, text: 'Photographer vex, delete the picture. Groom dey look you.', effects: { clout: -2 } },
          { weight: 1, text: 'Your photobomb go viral. Even the bride laugh.', effects: { clout: 4 } },
        ],
      },
      { text: 'Congratulate them and waka', outcomes: [{ text: '"Thank you! Aso-ebi na ₦35,000 o, make we add you?"' }] },
    ],
  },
  {
    id: 'park-icecream',
    title: 'Ice Cream Cart',
    speaker: 'Ice Cream Man',
    trigger: { type: 'npc', npc: 'icecream', cooldown: 90 },
    lines: ['Ice cream! Yoghurt! Cold zobo!', 'Ring ring!'],
    choices: [
      {
        text: 'Ice cream (₦800)',
        requires: { minMoney: 800 },
        lockedHint: 'Need ₦800',
        outcomes: [{ text: 'Cold, sweet, small melting for your hand. Perfect.', effects: { money: -800, clout: 1 } }],
      },
      {
        text: 'Buy for all the kids around (₦5,000)',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'The children shout your name like say you be Father Christmas.', effects: { money: -5000, clout: 6 } }],
      },
      { text: 'Bargain', outcomes: [{ text: '"Oga, ice cream dey melt. I no get time for price!"' }] },
    ],
  },
  {
    id: 'park-horse',
    title: 'Horse Ride',
    speaker: 'Horse Owner',
    trigger: { type: 'npc', npc: 'horse', hours: [7, 19], cooldown: 180 },
    unavailable: 'Horse don tire. E dey rest.',
    lines: ['Horse ride round the park! ₦3,000. Picture free!'],
    choices: [
      {
        text: 'Ride the horse (₦3,000)',
        requires: { minMoney: 3000 },
        lockedHint: 'Need ₦3,000',
        outcomes: [
          { weight: 4, text: 'You ride like a Durbar prince. Everybody dey snap you.', effects: { money: -3000, clout: 4, timeSkip: 0.5 } },
          { weight: 1, text: 'Horse stop suddenly. You land for grass. Your pride don wound.', effects: { money: -3000, clout: -2, timeSkip: 0.5 } },
        ],
      },
      { text: 'Pet the horse', outcomes: [{ text: 'The horse sneeze for your shirt. Thank you, horse.' }] },
      { text: 'Ask if na real horse', outcomes: [{ text: '"Na Abuja horse. E even get BVN."' }] },
    ],
  },
  {
    id: 'park-picnic',
    title: 'Family Picnic',
    speaker: 'Picnic Family',
    trigger: { type: 'npc', npc: 'picnic', hours: [9, 19], cooldown: 200 },
    unavailable: 'The family don pack their mat go house.',
    lines: ['Come join us! We get jollof, chicken and cold zobo.'],
    choices: [
      { text: 'Join the picnic', outcomes: [{ text: 'You chop well. Aunty pack you takeaway. Uncle tell you about his business plan.', effects: { clout: 2, timeSkip: 1 } }] },
      {
        text: 'Bring drinks for everybody (₦3,000)',
        requires: { minMoney: 3000 },
        lockedHint: 'Need ₦3,000',
        outcomes: [{ text: 'Uncle: "This one get home training!" You don become family.', effects: { money: -3000, clout: 4, timeSkip: 1 } }],
      },
      { text: 'Politely decline', outcomes: [{ text: 'Uncle: "Young people of nowadays!"' }] },
    ],
  },
  // ======================= THE CAGE =======================
  {
    id: 'cage-bouncer',
    title: 'The Cage',
    speaker: 'Bouncer Big Joe',
    trigger: { type: 'npc', npc: 'bouncer', hours: [20, 5], cooldown: 15 },
    unavailable: 'We never open. Come back by 9pm. And dress well!',
    lines: ['Hold on. Wetin you wear? Show your face.'],
    choices: [
      {
        text: 'Walk in confidently',
        requires: { outfit: ['suit', 'senator', 'agbada', 'asoebi', 'ankara'] },
        lockedHint: 'Dress up (suit, senator, agbada, ankara or aso-ebi)',
        outcomes: [{ text: 'Big Joe nod: "Correct. Enjoy." Bass hit your chest as you enter.', effects: { flag: 'cageRegular', teleport: { x: 1423, z: 210, heading: Math.PI } } }],
      },
      {
        text: 'Pay gate fee (₦10,000)',
        requires: { minMoney: 10000 },
        lockedHint: 'Need ₦10,000',
        outcomes: [{ text: 'Big Joe collect am: "Oya, go in."', effects: { money: -10000, flag: 'cageRegular', teleport: { x: 1423, z: 210, heading: Math.PI } } }],
      },
      {
        text: 'Say you know the DJ',
        outcomes: [
          { weight: 1, text: 'DJ shout from inside: "Na my guy!" You dey in!', effects: { clout: 2, flag: 'cageRegular', teleport: { x: 1423, z: 210, heading: Math.PI } } },
          { weight: 2, text: 'Big Joe: "Everybody know DJ. Go back."', effects: { clout: -1 } },
        ],
      },
    ],
  },
  {
    id: 'cage-bar',
    title: 'The Bar',
    speaker: 'Bartender',
    trigger: { type: 'npc', npc: 'bartender', cooldown: 60 },
    lines: ['Wetin you dey drink tonight? Chapman, Smirnoff, Hennessy?'],
    choices: [
      {
        text: 'Chapman (₦3,000)',
        requires: { minMoney: 3000 },
        lockedHint: 'Need ₦3,000',
        outcomes: [{ text: 'Cold Chapman with cucumber. Sweet like Sunday.', effects: { money: -3000, clout: 1 } }],
      },
      {
        text: 'Bottle service with sparklers (₦150,000)',
        requires: { minMoney: 150000 },
        lockedHint: 'Need ₦150,000',
        outcomes: [{ text: 'Sparklers, ladies, and the DJ shout your name. You are the main character tonight.', effects: { money: -150000, clout: 15 } }],
      },
      {
        text: 'Water abeg (₦500)',
        requires: { minMoney: 500 },
        lockedHint: 'Need ₦500',
        outcomes: [{ text: 'Bartender: "Water na ₦500. Na Abuja be this."', effects: { money: -500 } }],
      },
      { text: 'Just lean on the bar', outcomes: [{ text: 'You lean like say you own the place. Nobody believe you.' }] },
    ],
  },
  {
    id: 'cage-dj',
    title: 'DJ Booth',
    speaker: 'DJ Spinall-Abuja',
    trigger: { type: 'npc', npc: 'dj', cooldown: 90 },
    lines: ['My guy! Request? E go cost you o.'],
    choices: [
      {
        text: 'Request an Afrobeats banger (₦5,000)',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'The whole club scream when the beat drop. You did that.', effects: { money: -5000, clout: 3 } }],
      },
      {
        text: 'Make DJ shout your name (₦20,000)',
        requires: { minMoney: 20000 },
        lockedHint: 'Need ₦20,000',
        outcomes: [{ text: '"BIG SHOUT OUT TO MY GUY FOR THE BUILDING!" You feel like Davido.', effects: { money: -20000, clout: 7 } }],
      },
      { text: 'Hype the DJ', outcomes: [{ text: 'DJ: "MY GUYYY!" He play your favourite song anyway.', effects: { clout: 1 } }] },
    ],
  },
  {
    id: 'cage-dance',
    title: 'The Dance Floor',
    speaker: 'The Crowd',
    trigger: { type: 'npc', npc: 'dancefloor', cooldown: 45 },
    lines: ['The dance floor dey burn. Amapiano dey knock.'],
    choices: [
      {
        text: 'Show your best moves',
        outcomes: [
          { weight: 3, text: 'The crowd make circle for you. Legend!', effects: { clout: 4 } },
          { weight: 2, text: 'You slip. Somebody record am. E don dey go viral.', effects: { clout: -2 } },
        ],
      },
      {
        text: 'Dance-off with the best dancer',
        requires: { minClout: 20 },
        lockedHint: 'Need 20 clout',
        outcomes: [{ text: 'You do Zanku, Legwork and Buga back to back. You win!', effects: { clout: 8 } }],
      },
      { text: 'Stand by the wall and nod', outcomes: [{ text: 'Classic Abuja big boy move.' }] },
    ],
  },
  // ======================= GUZAPE =======================
  {
    id: 'guzape-agent',
    title: 'Guzape Plots',
    speaker: 'Estate Agent Kola',
    trigger: { type: 'npc', npc: 'agent', cooldown: 150 },
    lines: ['Guzape plot, C of O ready! ₦85 million only.', 'I go even remove my commission... small.'],
    choices: [
      {
        text: 'Buy the plot (₦85,000,000)',
        requires: { minMoney: 85000000 },
        lockedHint: 'Need ₦85,000,000',
        outcomes: [{ text: 'You now own land for Guzape. Your village don hear.', effects: { money: -85000000, clout: 30, flag: 'landlord' } }],
      },
      {
        text: 'Pay inspection fee (₦5,000)',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'He show you the plot... na big rock. "Mountain view, sir."', effects: { money: -5000 } }],
      },
      { text: 'Say you go think about am', outcomes: [{ text: '"Think fast o! Price go double tomorrow."' }] },
    ],
  },
  {
    id: 'guzape-view',
    title: 'Guzape Viewpoint',
    speaker: 'The View',
    trigger: { type: 'npc', npc: 'viewpoint', cooldown: 60 },
    lines: ['From here, the whole of Abuja dey shine. Aso Rock, the mosque, the lights.'],
    choices: [
      { text: 'Snap a selfie', outcomes: [{ text: 'Best view for Abuja. Caption: "Grateful."', effects: { clout: 3 } }] },
      { text: 'Sit and reflect on life', outcomes: [{ text: 'You decide to hustle harder. One day, one of these houses go be your own.', effects: { timeSkip: 1, clout: 1 } }] },
    ],
  },
];
