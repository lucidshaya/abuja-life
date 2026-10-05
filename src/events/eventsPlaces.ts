import type { GameEvent } from './EventSystem';

/**
 * Events for the ten extra real Abuja places built in world/locations/Abuja2.ts.
 * Each event is started by talking to the NPC spot named in its trigger.
 */
export const PLACE_EVENTS: GameEvent[] = [
  // ======================= FARM CITY =======================
  {
    id: 'farmcity-food',
    title: 'Farm City Garden',
    speaker: 'Waitress Amaka',
    trigger: { type: 'npc', npc: 'fc-waiter', cooldown: 90 },
    lines: ['Welcome to Farm City! We dey open 24 hours — morning, night, even 3am.', 'Wetin I go bring? Pepper soup dey hot, fish dey fresh, chapman dey cold.'],
    choices: [
      {
        text: 'Catfish pepper soup (₦6,500)',
        requires: { minMoney: 6500 },
        lockedHint: 'Need ₦6,500',
        outcomes: [
          { weight: 3, text: 'The pepper soup clear your sinus and your sins. You dey sweat like person wey run from Kubwa.', effects: { money: -6500, clout: 2, timeSkip: 1 } },
          { weight: 1, text: 'Fish head land for your plate. You no complain — na delicacy.', effects: { money: -6500, clout: 1, timeSkip: 1 } },
        ],
      },
      {
        text: 'Asun, chicken & chapman for the whole table (₦18,000)',
        requires: { minMoney: 18000 },
        lockedHint: 'Need ₦18,000',
        outcomes: [{ text: 'You order for everybody. Your table don turn small owambe. "Odogwu!"', effects: { money: -18000, clout: 5, timeSkip: 1.5 } }],
      },
      { text: 'Just water and the free WiFi', outcomes: [{ text: 'Amaka look you from head to toe: "Water na ₦700 o." You sip am slowly like Hennessy.', effects: { money: -700 } }] },
    ],
  },
  {
    id: 'farmcity-band',
    title: 'Live Band Night',
    speaker: 'Bandleader Chuks',
    trigger: { type: 'npc', npc: 'fc-band', hours: [18, 4], cooldown: 120 },
    unavailable: 'Band dey rest. We go start by 6pm — come back with your dancing shoe.',
    lines: ['Ladies and gentlemen, Farm City live band in the building!', 'Who get money make e come spray! Who no get, make e dance!'],
    choices: [
      {
        text: 'Dance in front of the stage',
        outcomes: [
          { weight: 3, text: 'Highlife enter your waist. People clear space for you. Legend!', effects: { clout: 3, timeSkip: 0.5 } },
          { weight: 1, text: 'You do one leg-work too much and land for Amaka tray. Small shame.', effects: { clout: -1, timeSkip: 0.5 } },
        ],
      },
      {
        text: 'Spray money (₦20,000 in ₦200 notes)',
        requires: { minMoney: 20000 },
        lockedHint: 'Need ₦20,000',
        outcomes: [{ text: 'Notes dey fly like confetti. Chuks shout your name and compose one song for you on the spot!', effects: { money: -20000, clout: 8, timeSkip: 0.5 } }],
      },
      {
        text: 'Request an Osadebe classic (₦5,000)',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'The old men for the garden stand up dance. One uncle hug you: "You get sense!"', effects: { money: -5000, clout: 3 } }],
      },
      {
        text: 'Grab the mic and sing with the band',
        requires: { minClout: 25 },
        lockedHint: 'Need 25 clout',
        outcomes: [
          { weight: 2, text: 'Your voice sweet! Somebody record am. Tomorrow you go trend.', effects: { clout: 7 } },
          { weight: 1, text: 'You forget the lyrics after first line. Band cover you well sha.', effects: { clout: 1 } },
        ],
      },
    ],
  },
  {
    id: 'farmcity-arcade',
    title: 'Game Arcade',
    speaker: 'Arcade Attendant',
    trigger: { type: 'npc', npc: 'fc-arcade', cooldown: 60 },
    lines: ['Game arcade! FIFA, fighting games, racing, claw machine.', 'Token na ₦1,000. Winner takes all, no vex.'],
    choices: [
      {
        text: 'FIFA challenge — bet ₦2,000',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [
          { weight: 1, text: 'You score for 90th minute! The small boy wey challenge you dey cry. +₦4,000.', effects: { money: 4000, clout: 2, timeSkip: 0.5 } },
          { weight: 1, text: 'Small boy beat you 5-0 and dey do Siuuu for your face. -₦2,000.', effects: { money: -2000, clout: -2, timeSkip: 0.5 } },
        ],
      },
      {
        text: 'Claw machine (₦1,000)',
        requires: { minMoney: 1000 },
        lockedHint: 'Need ₦1,000',
        outcomes: [
          { weight: 1, text: 'The claw grab teddy bear! You raise am like AFCON trophy.', effects: { money: -1000, clout: 3 } },
          { weight: 3, text: 'The claw touch the teddy... and release am. As e dey always do.', effects: { money: -1000 } },
        ],
      },
      {
        text: 'Use your "cheat code" on the racing game',
        requires: { role: ['techbro'] },
        lockedHint: 'Only for Tech Bros',
        outcomes: [{ text: 'You no hack am o — you just sabi the menu. Free 10 tokens and new high score.', effects: { clout: 3 } }],
      },
      { text: 'Watch other people play', outcomes: [{ text: 'You give free commentary. Nobody ask you, but e sweet.', effects: { timeSkip: 0.5 } }] },
    ],
  },
  {
    id: 'farmcity-lounge',
    title: 'Farm City Lounge Bar',
    speaker: 'Lounge Bartender',
    trigger: { type: 'npc', npc: 'fc-bar', cooldown: 60 },
    lines: ['Welcome to the lounge. Cocktail, palm wine, chapman — wetin you dey drink?'],
    choices: [
      {
        text: 'Chapman (₦3,500)',
        requires: { minMoney: 3500 },
        lockedHint: 'Need ₦3,500',
        outcomes: [{ text: 'Cold chapman with cucumber. E sweet like Christmas.', effects: { money: -3500, clout: 1 } }],
      },
      {
        text: 'Open a tab for the whole lounge (₦250,000)',
        requires: { role: ['senator', 'minister', 'techbro'], minMoney: 250000 },
        lockedHint: 'Senators, Ministers or Tech Bros with ₦250,000',
        outcomes: [{ text: '"Drinks on Oga!" The whole lounge stand up. Even the band play your name.', effects: { money: -250000, clout: 15, timeSkip: 1 } }],
      },
      {
        text: 'Palm wine in calabash (₦2,000)',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [
          { weight: 2, text: 'Fresh palm wine from Nasarawa. You don dey talk English pass Shakespeare.', effects: { money: -2000, clout: 2 } },
          { weight: 1, text: 'E strong pass as you think. You sleep for the sofa small.', effects: { money: -2000, timeSkip: 2 } },
        ],
      },
      { text: 'Just chill and watch the band', outcomes: [{ text: 'Bartender: "No wahala, relax." He still leave the bill menu for your front.' }] },
    ],
  },

  // ======================= BANEX PLAZA =======================
  {
    id: 'banex-buy',
    title: 'Banex Phone Deal',
    speaker: 'Phone Hawker Ik',
    trigger: { type: 'npc', npc: 'banex-phone', hours: [8, 20], cooldown: 120 },
    unavailable: 'Banex don close, my guy. Come tomorrow morning — I go do you better price.',
    lines: ['Bros! iPhone, Samsung, Tecno, Infinix — brand new and London used!', 'Which one you want? I go do you correct price.'],
    choices: [
      {
        text: 'Brand new Tecno, sealed (₦180,000)',
        requires: { minMoney: 180000 },
        lockedHint: 'Need ₦180,000',
        outcomes: [{ text: 'Sealed, receipt, warranty — everything correct. Your old phone fit retire now.', effects: { money: -180000, clout: 4 } }],
      },
      {
        text: '"London used" iPhone (₦350,000)',
        requires: { minMoney: 350000 },
        lockedHint: 'Need ₦350,000',
        outcomes: [
          { weight: 2, text: 'E clean like new! Battery health 92%. You don hammer.', effects: { money: -350000, clout: 8 } },
          { weight: 1, text: 'Na "Lagos used" o. Battery health 61% and Face ID dey sleep.', effects: { money: -350000, clout: 1 } },
          { weight: 1, text: 'You reach house, open the box... na bar soap inside. Ik number no dey go again.', effects: { money: -350000, clout: -5 } },
        ],
      },
      {
        text: 'Pouch & screen guard (₦3,000)',
        requires: { minMoney: 3000 },
        lockedHint: 'Need ₦3,000',
        outcomes: [{ text: 'He fix the screen guard with ATM card. No bubble. Professional.', effects: { money: -3000, clout: 1 } }],
      },
      { text: 'Just price am', outcomes: [{ text: 'Ik: "Oga, you dey waste my time. Last price na last price." He still collect your number.' }] },
    ],
  },
  {
    id: 'banex-repair',
    title: 'Screen Doctor',
    speaker: 'Screen Doctor',
    trigger: { type: 'npc', npc: 'banex-repair', hours: [8, 20], cooldown: 120 },
    unavailable: 'Shop don lock. Even doctor dey rest.',
    lines: ['Your screen crack? I fit change am in 30 minutes.', 'You want original or "original"?'],
    choices: [
      {
        text: 'Original screen (₦45,000)',
        requires: { minMoney: 45000 },
        lockedHint: 'Need ₦45,000',
        outcomes: [{ text: 'Screen bright like new moon. He even clean your charging port free.', effects: { money: -45000, clout: 2, timeSkip: 0.5, flag: 'phoneFixed' } }],
      },
      {
        text: 'Cheap screen (₦12,000)',
        requires: { minMoney: 12000 },
        lockedHint: 'Need ₦12,000',
        outcomes: [
          { weight: 1, text: 'E work! E no too bright, but e work.', effects: { money: -12000, timeSkip: 0.5, flag: 'phoneFixed' } },
          { weight: 1, text: 'The touch dey type "k" anytime you press "o". Your chats don turn Igbo-Yoruba mix.', effects: { money: -12000, clout: -1, timeSkip: 0.5 } },
        ],
      },
      {
        text: 'Fix charging port (₦5,000)',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'He blow the port with mouth, put am back. "₦5,000." E don charge sha.', effects: { money: -5000 } }],
      },
      { text: 'Ask if he fit unlock iCloud', outcomes: [{ text: 'He look left, look right: "Come back tomorrow night. No tell anybody." You waka quick.' }] },
    ],
  },
  {
    id: 'banex-sell',
    title: 'Sell Your Phone',
    speaker: 'Alhaji "Swap"',
    trigger: { type: 'npc', npc: 'banex-buyer', hours: [8, 20], cooldown: 240 },
    unavailable: 'Alhaji don go pray. Come back tomorrow.',
    lines: ['You wan sell your phone? I dey buy everything — even the one wey fall inside water.'],
    choices: [
      {
        text: 'Sell your phone (₦35,000)',
        outcomes: [{ text: 'He price am ₦35k. Tomorrow e go dey his table for ₦120k. Business na business.', effects: { money: 35000, clout: -1 } }],
      },
      {
        text: 'Haggle like a real trader',
        requires: { role: ['trader'] },
        lockedHint: 'Only for Market Traders',
        outcomes: [{ text: 'You trade talk sharp-sharp. Alhaji laugh: "You be market person!" He pay ₦60,000.', effects: { money: 60000, clout: 2 } }],
      },
      {
        text: 'Swap and top up (₦60,000)',
        requires: { minMoney: 60000 },
        lockedHint: 'Need ₦60,000',
        outcomes: [{ text: 'You swap your old phone plus ₦60k for a cleaner one. Upgrade!', effects: { money: -60000, clout: 4 } }],
      },
      { text: 'Na joke, I no dey sell', outcomes: [{ text: 'Alhaji: "Ko matsala. When e spoil, bring am."' }] },
    ],
  },

  // ======================= TRANSCORP HILTON =======================
  {
    id: 'hilton-room',
    title: 'Transcorp Hilton Reception',
    speaker: 'Receptionist Zainab',
    trigger: { type: 'npc', npc: 'hilton-reception', cooldown: 60 },
    lines: ['Good evening and welcome to Transcorp Hilton Abuja.', 'How may I help you today?'],
    choices: [
      {
        text: 'Book a room for the night (₦250,000)',
        requires: { minMoney: 250000 },
        lockedHint: 'Need ₦250,000',
        outcomes: [{ text: 'King-size bed, AC wey cold like Jos, breakfast buffet. You sleep like ambassador.', effects: { money: -250000, clout: 8, sleep: true } }],
      },
      {
        text: 'Presidential Suite (₦2,500,000)',
        requires: { role: ['senator', 'minister'], minMoney: 2500000 },
        lockedHint: 'Senators & Ministers with ₦2.5m only',
        outcomes: [{ text: 'Butler, jacuzzi, view of Aso Rock. Your aides post am for status. Protocol!', effects: { money: -2500000, clout: 20, sleep: true } }],
      },
      { text: 'Ask for the WiFi password', outcomes: [{ text: 'Zainab smile: "For guests only, sir." You sit for lobby anyway, dey look like guest.', effects: { clout: -1 } }] },
      {
        text: 'Say you dey wait for "Chairman"',
        outcomes: [
          { weight: 1, text: 'She bring you free tea while you "wait". Correct packaging!', effects: { clout: 2 } },
          { weight: 1, text: 'Security ask which Chairman. You mention name of your village chairman.', effects: { clout: -2 } },
        ],
      },
    ],
  },
  {
    id: 'hilton-pool',
    title: 'Hilton Poolside',
    speaker: 'Pool Waiter',
    trigger: { type: 'npc', npc: 'hilton-pool', hours: [7, 20], cooldown: 120 },
    unavailable: 'Pool don close for today. Lifeguard don go house.',
    lines: ['Poolside service! Day pass na ₦35,000 — towel and one mocktail inside.'],
    choices: [
      {
        text: 'Buy a day pass and swim (₦35,000)',
        requires: { minMoney: 35000 },
        lockedHint: 'Need ₦35,000',
        outcomes: [{ text: 'You float for water like Dangote. Your Instagram don get content for one month.', effects: { money: -35000, clout: 5, timeSkip: 2 } }],
      },
      {
        text: 'Cocktail by the pool (₦9,000)',
        requires: { minMoney: 9000 },
        lockedHint: 'Need ₦9,000',
        outcomes: [{ text: 'Small umbrella inside the glass. Na the umbrella be the ₦7,000.', effects: { money: -9000, clout: 2 } }],
      },
      {
        text: 'Snap selfie by the pool and waka',
        outcomes: [
          { weight: 2, text: 'Caption: "Weekend vibes @ Transcorp." Nobody know say you no pay.', effects: { clout: 3 } },
          { weight: 1, text: 'Security tap your shoulder: "Oga, guest wristband?" You run.', effects: { clout: -2 } },
        ],
      },
    ],
  },
  {
    id: 'hilton-network',
    title: 'Big Man Networking',
    speaker: 'Chief Dagogo',
    trigger: { type: 'npc', npc: 'hilton-bigman', cooldown: 300 },
    lines: ['Young person! You look like somebody wey get vision.', 'I get oil block. I need partners. Serious partners.'],
    choices: [
      {
        text: 'Pitch your business idea',
        outcomes: [
          { weight: 2, text: 'Chief nod, collect your card: "I go call you." Your heart dey beat.', effects: { clout: 4, flag: 'chiefCard' } },
          { weight: 1, text: 'Chief fall asleep for middle of your pitch. His aide wake am: "Next!"', effects: { clout: -1 } },
        ],
      },
      {
        text: 'Invest ₦100,000 in his oil block',
        requires: { minMoney: 100000 },
        lockedHint: 'Need ₦100,000',
        outcomes: [
          { weight: 1, text: 'Oil price go up! Chief send you ₦300,000. "Partner!"', effects: { money: 200000, clout: 6 } },
          { weight: 2, text: 'Chief don travel. His number no dey go. The oil block na for Google Maps.', effects: { money: -100000, clout: -3 } },
        ],
      },
      {
        text: 'Talk "constituency projects" (Senators & Ministers)',
        requires: { role: ['senator', 'minister'] },
        lockedHint: 'Only Senators and Ministers',
        outcomes: [
          { weight: 1, text: 'He offer you "consultancy fee". You remember say journalists dey everywhere. You decline. Integrity!', effects: { clout: 8 } },
          { weight: 1, text: 'Una agree on one real road project for your constituency. Your people go hear am.', effects: { clout: 6, timeSkip: 1 } },
        ],
      },
    ],
  },

  // ======================= UNITY FOUNTAIN =======================
  {
    id: 'unity-vigil',
    title: 'Candlelight Vigil',
    speaker: 'Vigil Organiser',
    trigger: { type: 'npc', npc: 'unity-vigil', hours: [17, 23], cooldown: 180 },
    unavailable: 'Vigil go start by 5pm. Come with candle and good heart.',
    lines: ['We dey hold candlelight vigil for peace and unity.', 'Thirty-six states plus FCT — one Nigeria. Light candle with us.'],
    choices: [
      {
        text: 'Light a candle (₦500)',
        requires: { minMoney: 500 },
        lockedHint: 'Need ₦500',
        outcomes: [{ text: 'Small flame, big hope. Strangers hold hand and sing "Arise O Compatriots".', effects: { money: -500, clout: 3, timeSkip: 0.5 } }],
      },
      {
        text: 'Give a short speech',
        requires: { minClout: 15 },
        lockedHint: 'Need 15 clout',
        outcomes: [{ text: 'You talk from your heart. People clap, one aunty cry. Journalist write your name.', effects: { clout: 6, timeSkip: 0.5 } }],
      },
      { text: 'Stand quietly and pray', outcomes: [{ text: 'You pray for light, peace and better road. Amen from all corners.', effects: { clout: 1, timeSkip: 0.5 } }] },
    ],
  },
  {
    id: 'unity-jog',
    title: 'Jog Round Unity Fountain',
    speaker: 'Coach Fatima',
    trigger: { type: 'npc', npc: 'unity-jog', cooldown: 150 },
    lines: ['Jog round Unity Fountain! 37 pillars, 37 waves — pass every state!', 'Na health be wealth, my dear.'],
    choices: [
      {
        text: 'Jog 5 laps',
        outcomes: [
          { weight: 3, text: 'You run past Kano, Lagos, Rivers... all Nigeria in one hour. Your body dey thank you.', effects: { clout: 2, timeSkip: 1 } },
          { weight: 1, text: 'After 2 laps you stop to buy pure water and gist. Na still exercise.', effects: { timeSkip: 1 } },
        ],
      },
      {
        text: 'Join the bootcamp class (₦3,000)',
        requires: { minMoney: 3000 },
        lockedHint: 'Need ₦3,000',
        outcomes: [{ text: 'Burpees, squats, frog jump. Tomorrow your leg go report you to police. Worth it.', effects: { money: -3000, clout: 4, timeSkip: 1.5 } }],
      },
      {
        text: 'Race Coach Fatima',
        requires: { minClout: 20 },
        lockedHint: 'Need 20 clout',
        outcomes: [
          { weight: 1, text: 'You win by one step! Coach shake your hand: "You fit run for Nigeria!"', effects: { clout: 6, timeSkip: 0.5 } },
          { weight: 2, text: 'Coach finish, drink water, still wait for you for 3 minutes.', effects: { clout: -1, timeSkip: 0.5 } },
        ],
      },
    ],
  },
  {
    id: 'unity-photo',
    title: 'Snap at Unity Fountain',
    speaker: 'Fountain Photographer',
    trigger: { type: 'npc', npc: 'unity-photo', hours: [7, 19], cooldown: 120 },
    unavailable: 'Light don go. Come back tomorrow make I snap you fine.',
    lines: ['Find your state pillar make I snap you there! ₦2,000 only.'],
    choices: [
      {
        text: 'Snap by your state pillar (₦2,000)',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [{ text: 'You and your state name, fountain behind. Your mama print am and hang for parlour.', effects: { money: -2000, clout: 3 } }],
      },
      {
        text: 'Drone shot of the whole fountain (₦10,000)',
        requires: { minMoney: 10000 },
        lockedHint: 'Need ₦10,000',
        outcomes: [{ text: 'The drone show all 37 pillars and you for middle like president. Viral!', effects: { money: -10000, clout: 6 } }],
      },
      { text: 'Count the pillars yourself', outcomes: [{ text: 'You count 36... 37... 38? Abeg no go spread fake news. Na 37.' }] },
    ],
  },

  // ======================= NATIONAL ASSEMBLY =======================
  {
    id: 'nass-gallery',
    title: 'Public Gallery',
    speaker: 'Clerk of the House',
    trigger: { type: 'npc', npc: 'nass-clerk', hours: [10, 17], cooldown: 240 },
    unavailable: 'Plenary don adjourn till next legislative day. Come back 10am.',
    lines: ['Public gallery dey open for plenary.', 'No phone, no noise, and nobody go shout "Point of order!" from gallery.'],
    choices: [
      {
        text: 'Watch plenary from the gallery',
        outcomes: [
          { weight: 2, text: 'Senators debate one bill for three hours, then step am down. You learn plenty grammar.', effects: { clout: 2, timeSkip: 2 } },
          { weight: 1, text: 'One honourable member sleep for back row. You no snap am — you get sense.', effects: { clout: 3, timeSkip: 2 } },
        ],
      },
      {
        text: 'Submit a petition (₦2,000 photocopy & binding)',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [{ text: 'Clerk stamp am "RECEIVED". E go reach committee... one day.', effects: { money: -2000, clout: 3, timeSkip: 1 } }],
      },
      {
        text: 'Take your seat on the floor (Senators)',
        requires: { role: ['senator'] },
        lockedHint: 'Only Distinguished Senators',
        outcomes: [{ text: '"Point of order, Mr. President!" Your motion pass by voice vote. The ayes have it!', effects: { clout: 10, timeSkip: 3 } }],
      },
      {
        text: 'Defend your ministry budget (Ministers)',
        requires: { role: ['minister'] },
        lockedHint: 'Only Ministers',
        outcomes: [
          { weight: 1, text: 'You defend am line by line. Committee chairman nod. Budget approved!', effects: { clout: 8, timeSkip: 3 } },
          { weight: 1, text: 'They ask why "office tea" cost ₦40 million. You promise to "get back to them".', effects: { clout: -4, timeSkip: 3 } },
        ],
      },
    ],
  },
  {
    id: 'nass-protest',
    title: 'Protest at the Gate',
    speaker: 'Protest Leader Aisha',
    trigger: { type: 'npc', npc: 'nass-protest', hours: [8, 19], cooldown: 240 },
    unavailable: 'Protesters don go house. Dem go come back tomorrow morning, peacefully.',
    lines: ['Comrade! We dey here peacefully. #EndBadGovernance!', 'We want light, fuel price wey make sense, and jobs for youths!'],
    choices: [
      {
        text: 'Join the peaceful protest',
        outcomes: [
          { weight: 3, text: 'You chant till your voice crack. One journalist interview you. You sound like activist.', effects: { clout: 5, timeSkip: 1 } },
          { weight: 1, text: 'Police come with tear gas. Everybody scatter. You run reach the road, eye dey pepper you.', effects: { clout: 2, timeSkip: 1 } },
        ],
      },
      {
        text: 'Donate water & snacks (₦10,000)',
        requires: { minMoney: 10000 },
        lockedHint: 'Need ₦10,000',
        outcomes: [{ text: 'Pure water and gala for everybody. Aisha shout: "This one na true patriot!"', effects: { money: -10000, clout: 6 } }],
      },
      {
        text: 'Address the protesters (Senators & Ministers)',
        requires: { role: ['senator', 'minister'] },
        lockedHint: 'Only Senators and Ministers',
        outcomes: [
          { weight: 1, text: 'You promise to "look into it". Crowd boo you till you enter your car.', effects: { clout: -4 } },
          { weight: 1, text: 'You listen, write their demands down and sign. Crowd cheer! Na so leader suppose be.', effects: { clout: 9, timeSkip: 1 } },
        ],
      },
    ],
  },
  {
    id: 'nass-press',
    title: 'Press Interview',
    speaker: 'Reporter Tolu',
    trigger: { type: 'npc', npc: 'nass-press', hours: [8, 20], cooldown: 180 },
    unavailable: 'Camera don pack. News at 9!',
    lines: ['Good afternoon! Naija News 24 here.', 'Fit give us 30 seconds on the state of the nation?'],
    choices: [
      {
        text: 'Talk about fuel price and NEPA',
        outcomes: [
          { weight: 2, text: 'You talk with passion. Clip go viral: "Abuja youth don tire!"', effects: { clout: 4 } },
          { weight: 1, text: 'You stammer for live TV. Your aunty for village call you immediately.', effects: { clout: -1 } },
        ],
      },
      {
        text: 'Grant an exclusive interview (Senators & Ministers)',
        requires: { role: ['senator', 'minister'] },
        lockedHint: 'Only Senators and Ministers',
        outcomes: [{ text: 'You explain your bill with charts and calm voice. Headline tomorrow: "Finally, A Leader Who Explains."', effects: { clout: 7, timeSkip: 0.5 } }],
      },
      {
        text: 'Wave at the camera, say hi to mama',
        outcomes: [{ text: '"Mummy, I don reach Abuja!" Your whole family watch am at 9pm news.', effects: { clout: 2 } }],
      },
    ],
  },
  {
    id: 'nass-senator',
    title: 'Distinguished Senator',
    speaker: 'Senator Okon',
    trigger: { type: 'npc', npc: 'nass-senator', hours: [8, 18], cooldown: 240 },
    unavailable: 'Senator don go committee meeting. Aide say "come back tomorrow".',
    lines: ['Ah! Constituent! You come see me for Abuja?', 'Wetin you want? Make e quick o — plenary don start.'],
    choices: [
      {
        text: 'Ask for a borehole for your area',
        outcomes: [
          { weight: 2, text: 'He promise borehole... "next budget". His aide write am inside small notebook.', effects: { clout: 1 } },
          { weight: 1, text: 'He dash you ₦20,000 "for transport". "Greet your people for me!"', effects: { money: 20000, clout: 1 } },
        ],
      },
      {
        text: 'Ask for a job as his aide',
        requires: { minClout: 30 },
        lockedHint: 'Need 30 clout',
        outcomes: [{ text: '"You get energy! Resume Monday." First salary advance: ₦50,000.', effects: { money: 50000, clout: 4, flag: 'senatorAide' } }],
      },
      {
        text: 'Talk shop as colleagues (Senators & Ministers)',
        requires: { role: ['senator', 'minister'] },
        lockedHint: 'Only Senators and Ministers',
        outcomes: [{ text: 'Una agree on the bill and he invite you to his Guzape house party. Abuja politics!', effects: { clout: 6, timeSkip: 1 } }],
      },
    ],
  },

  // ======================= SILVERBIRD GALLERIA =======================
  {
    id: 'silverbird-movie',
    title: 'Silverbird Cinemas',
    speaker: 'Cinema Ticket Girl',
    trigger: { type: 'npc', npc: 'sb-ticket', hours: [10, 24], cooldown: 120 },
    unavailable: 'Last show don start. Come back tomorrow.',
    lines: ['Now showing: "Owambe Wahala", "Lagos to Abuja", "The Senator\'s Wife".', 'Which one you wan watch?'],
    choices: [
      {
        text: 'Regular ticket (₦4,500)',
        requires: { minMoney: 4500 },
        lockedHint: 'Need ₦4,500',
        outcomes: [
          { weight: 2, text: '"Owambe Wahala" sweet die! The whole hall dey laugh for 2 hours.', effects: { money: -4500, clout: 2, timeSkip: 2 } },
          { weight: 1, text: 'Somebody phone ring 6 times for the movie. Na "Lagos to Abuja" — still sweet.', effects: { money: -4500, clout: 1, timeSkip: 2 } },
        ],
      },
      {
        text: 'VIP recliner + combo (₦12,000)',
        requires: { minMoney: 12000 },
        lockedHint: 'Need ₦12,000',
        outcomes: [{ text: 'Recliner chair, blanket, popcorn and Chapman. You sleep small for middle. Still enjoyment.', effects: { money: -12000, clout: 4, timeSkip: 2 } }],
      },
      {
        text: 'Sneak in through the exit door',
        outcomes: [
          { weight: 1, text: 'You enter! Front row, neck dey pain you, but free na free.', effects: { clout: 2, timeSkip: 2 } },
          { weight: 2, text: 'Usher flash torch for your face: "Ticket?" Shame catch you.', effects: { clout: -3 } },
        ],
      },
    ],
  },
  {
    id: 'silverbird-popcorn',
    title: 'Popcorn Stand',
    speaker: 'Popcorn Seller',
    trigger: { type: 'npc', npc: 'sb-popcorn', cooldown: 60 },
    lines: ['Hot popcorn, sweet or salted! Chin-chin, Gala, cold Fanta!'],
    choices: [
      {
        text: 'Big popcorn (₦2,500)',
        requires: { minMoney: 2500 },
        lockedHint: 'Need ₦2,500',
        outcomes: [{ text: 'Sweet and salted mixed. Correct choice.', effects: { money: -2500, clout: 1 } }],
      },
      {
        text: 'Gala & Fanta combo (₦1,200)',
        requires: { minMoney: 1200 },
        lockedHint: 'Need ₦1,200',
        outcomes: [{ text: 'The original Naija cinema combo. Your childhood don return.', effects: { money: -1200, clout: 1 } }],
      },
      { text: 'Ask for small taste', outcomes: [{ text: 'He give you one popcorn. One. "Taste don finish."' }] },
    ],
  },
  {
    id: 'silverbird-star',
    title: 'Nollywood Star',
    speaker: 'Nollywood Star',
    trigger: { type: 'npc', npc: 'sb-star', hours: [12, 23], cooldown: 240 },
    unavailable: 'The star don enter her car. Paparazzi still dey chase am.',
    lines: ['Yes, yes, na me. No shout o — I dey incognito.', '...With red carpet and two photographers. Normal.'],
    choices: [
      {
        text: 'Ask for a selfie',
        outcomes: [
          { weight: 3, text: 'She pose like pro. Your selfie get 2,000 likes before you reach car.', effects: { clout: 4 } },
          { weight: 1, text: 'Her manager block you: "No pictures today!"', effects: { clout: -1 } },
        ],
      },
      {
        text: 'Pitch your movie script',
        requires: { minClout: 20 },
        lockedHint: 'Need 20 clout',
        outcomes: [
          { weight: 1, text: 'She like am! "Send am to my producer." Option fee: ₦100,000!', effects: { money: 100000, clout: 8, flag: 'scriptSold' } },
          { weight: 2, text: '"Send am to my manager email." The email bounce.', effects: { clout: 1 } },
        ],
      },
      {
        text: 'Audition on the spot',
        outcomes: [
          { weight: 1, text: 'You cry on command. She clap: "You get talent! Come for casting Monday."', effects: { clout: 5 } },
          { weight: 1, text: 'You forget your line and start to laugh. She laugh too. Na comedy you suppose do.', effects: { clout: 1 } },
        ],
      },
    ],
  },

  // ======================= WONDERLAND =======================
  {
    id: 'wonderland-ferris',
    title: 'Wonder Wheel',
    speaker: 'Ferris Wheel Operator',
    trigger: { type: 'npc', npc: 'wl-ferris', hours: [9, 22], cooldown: 120 },
    unavailable: 'Wheel don stop for today. Operator dey count money.',
    lines: ['Wonder Wheel! From top, you go see Aso Rock, Area 1, everything!', '₦2,000 per person. Hold tight.'],
    choices: [
      {
        text: 'Ride the Ferris wheel (₦2,000)',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [
          { weight: 3, text: 'From the top, Abuja fine like postcard. Wind dey blow your cap.', effects: { money: -2000, clout: 2, timeSkip: 0.5 } },
          { weight: 1, text: 'Wheel stop for top — light don go. You stay up there 30 minutes dey pray.', effects: { money: -2000, clout: 1, timeSkip: 1 } },
        ],
      },
      {
        text: 'Book a whole cabin for a date (₦10,000)',
        requires: { minMoney: 10000 },
        lockedHint: 'Need ₦10,000',
        outcomes: [{ text: 'Sunset, cabin, two of una. Romantic pass Nollywood.', effects: { money: -10000, clout: 6, timeSkip: 0.5 } }],
      },
      { text: 'Just watch it turn', outcomes: [{ text: 'You watch the wheel go round and round. Na so life be.' }] },
    ],
  },
  {
    id: 'wonderland-bumper',
    title: 'Bumper Cars',
    speaker: 'Bumper Car Boy',
    trigger: { type: 'npc', npc: 'wl-bumper', hours: [9, 22], cooldown: 90 },
    unavailable: 'Bumper cars don close. Battery dey charge.',
    lines: ['Bumper cars! ₦1,500 for 5 minutes.', 'If dem jam you, no vex — na the game.'],
    choices: [
      {
        text: 'Drive like an Abuja driver (₦1,500)',
        requires: { minMoney: 1500 },
        lockedHint: 'Need ₦1,500',
        outcomes: [
          { weight: 1, text: 'You jam everybody, nobody jam you. Champion of the arena!', effects: { money: -1500, clout: 3 } },
          { weight: 1, text: 'One small boy jam you from back six times. He dey laugh.', effects: { money: -1500, clout: -1 } },
        ],
      },
      {
        text: 'Show them real driving (Taxi Drivers)',
        requires: { role: ['driver'] },
        lockedHint: 'Only for Taxi Drivers',
        outcomes: [{ text: 'You dodge everybody like Kubwa expressway. The boy say: "Oga driver, ride free!"', effects: { clout: 5 } }],
      },
      { text: 'Watch the kids', outcomes: [{ text: 'Children dey scream with joy. Your mind go back to your own childhood.', effects: { clout: 1 } }] },
    ],
  },
  {
    id: 'wonderland-candy',
    title: 'Candy Floss',
    speaker: 'Candy Floss Mama',
    trigger: { type: 'npc', npc: 'wl-candy', cooldown: 60 },
    lines: ['Candy floss! Pink, blue! Popcorn and cold zobo!'],
    choices: [
      {
        text: 'Candy floss (₦700)',
        requires: { minMoney: 700 },
        lockedHint: 'Need ₦700',
        outcomes: [{ text: 'Sugar cloud for stick. Your beard don turn pink.', effects: { money: -700, clout: 1 } }],
      },
      {
        text: 'Buy for all the kids around (₦6,000)',
        requires: { minMoney: 6000 },
        lockedHint: 'Need ₦6,000',
        outcomes: [{ text: 'Children surround you like Father Christmas. Parents dey bless you.', effects: { money: -6000, clout: 6 } }],
      },
      { text: 'Ask for discount', outcomes: [{ text: 'Mama: "Discount for sugar? You know how much sugar cost now?"' }] },
    ],
  },

  // ======================= JABI MOTOR PARK =======================
  {
    id: 'motorpark-ticket',
    title: 'Jabi Motor Park Tickets',
    speaker: 'Ticket Agent',
    trigger: { type: 'npc', npc: 'jmp-ticket', hours: [5, 21], cooldown: 120 },
    unavailable: 'Last bus don comot. First loading na 5am.',
    lines: ['Kaduna! Kaduna! Last two seats!', 'Lagos night bus dey load. Where you dey go?'],
    choices: [
      {
        text: 'Day trip to Kaduna & back (₦18,000)',
        requires: { minMoney: 18000 },
        lockedHint: 'Need ₦18,000',
        outcomes: [{ text: 'Kilishi for Kaduna, tuwo for lunch, back to Abuja before dark. Your back dey pain but your belle full.', effects: { money: -18000, clout: 3, timeSkip: 7 } }],
      },
      {
        text: 'Bus to Kubwa (₦800)',
        requires: { minMoney: 800 },
        lockedHint: 'Need ₦800',
        outcomes: [{ text: 'Bus full, driver move. 45 minutes later — Kubwa! Your knee don dey touch your chin.', effects: { money: -800, timeSkip: 1, teleport: { x: -490, z: -238, heading: Math.PI / 2 } } }],
      },
      {
        text: 'Night bus to Lagos and back (₦32,000)',
        requires: { minMoney: 32000 },
        lockedHint: 'Need ₦32,000',
        outcomes: [{ text: 'Twelve hours. One pastor preach for three. You reach Lagos, see Third Mainland Bridge, enter the next bus back. Vibes only.', effects: { money: -32000, clout: 4, timeSkip: 14 } }],
      },
      { text: 'I just dey look', outcomes: [{ text: 'Agent: "Looking no be travelling o!"' }] },
    ],
  },
  {
    id: 'motorpark-tout',
    title: 'Agbero Wahala',
    speaker: 'Agbero Tout',
    trigger: { type: 'npc', npc: 'jmp-tout', cooldown: 150 },
    lines: ['Oga! Where you dey go? Come, come, come!', 'Na me get this park. Settle me first.'],
    choices: [
      {
        text: 'Pay "loading fee" (₦500)',
        requires: { minMoney: 500 },
        lockedHint: 'Need ₦500',
        outcomes: [{ text: 'He collect am, hail you: "Chairman!" You no even dey travel.', effects: { money: -500, clout: -1 } }],
      },
      {
        text: 'Tell am say you no dey travel',
        outcomes: [
          { weight: 2, text: '"Ehen? Then wetin you come do for park?" He leave you for next customer.' },
          { weight: 1, text: 'He follow you for 50 metres dey market Kaduna bus. You don almost buy ticket.', effects: { clout: -1 } },
        ],
      },
      {
        text: 'Show your cab permit (Taxi Drivers)',
        requires: { role: ['driver'] },
        lockedHint: 'Only for Taxi Drivers',
        outcomes: [{ text: '"Ah, na our person! No vex." He give you two passengers to Wuse. ₦3,000 enter.', effects: { money: 3000, clout: 2, timeSkip: 1 } }],
      },
    ],
  },
  {
    id: 'motorpark-shayi',
    title: 'Mai Shayi',
    speaker: 'Mai Shayi',
    trigger: { type: 'npc', npc: 'jmp-shayi', cooldown: 90 },
    lines: ['Sannu! Tea, Lipton, bread, egg, indomie — everything dey.'],
    choices: [
      {
        text: 'Shayi with bread & egg (₦1,200)',
        requires: { minMoney: 1200 },
        lockedHint: 'Need ₦1,200',
        outcomes: [{ text: 'Sweet tea with condensed milk and fried egg for bread. Breakfast of champions.', effects: { money: -1200, clout: 1, timeSkip: 0.5 } }],
      },
      {
        text: 'Indomie & egg special (₦2,000)',
        requires: { minMoney: 2000 },
        lockedHint: 'Need ₦2,000',
        outcomes: [{ text: 'He fry am with pepper and onion. Na this one 5-star hotel no fit cook.', effects: { money: -2000, clout: 2, timeSkip: 0.5 } }],
      },
      { text: 'Just gist with Mai Shayi', outcomes: [{ text: 'He tell you everything wey dey happen for Abuja — including who your neighbour dey date.', effects: { clout: 1 } }] },
    ],
  },

  // ======================= NATIONAL STADIUM =======================
  {
    id: 'stadium-match',
    title: 'Super Eagles Match Day',
    speaker: 'Match Steward',
    trigger: { type: 'npc', npc: 'st-match', hours: [12, 21], cooldown: 300 },
    unavailable: 'No match today. Come back tomorrow afternoon — gate open by 12.',
    lines: ['Super Eagles dey play today!', 'Popular stand na ₦5,000, VIP na ₦25,000.'],
    choices: [
      {
        text: 'Popular stand (₦5,000)',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [
          { weight: 2, text: 'Super Eagles win 2-0! You dey hug strangers. Vuvuzela for your ear all night.', effects: { money: -5000, clout: 5, timeSkip: 2 } },
          { weight: 1, text: 'Draw 1-1. Everybody dey blame the coach. You too.', effects: { money: -5000, clout: 2, timeSkip: 2 } },
          { weight: 1, text: 'We lose 0-1 for injury time. Your heart don break, but you go come back.', effects: { money: -5000, timeSkip: 2 } },
        ],
      },
      {
        text: 'VIP box (₦25,000)',
        requires: { minMoney: 25000 },
        lockedHint: 'Need ₦25,000',
        outcomes: [{ text: 'Cushion chair, small chops and you sit near ex-international. Eagles win 3-1!', effects: { money: -25000, clout: 7, timeSkip: 2 } }],
      },
      {
        text: 'Climb the fence and enter free',
        outcomes: [
          { weight: 1, text: 'You land inside! You watch the match from standing area. Free enjoyment.', effects: { clout: 3, timeSkip: 2 } },
          { weight: 2, text: 'Mobile police catch you for half-way. You do frog jump for 20 minutes.', effects: { clout: -4, timeSkip: 0.5 } },
        ],
      },
    ],
  },
  {
    id: 'stadium-jersey',
    title: 'Super Eagles Jersey',
    speaker: 'Jersey Seller',
    trigger: { type: 'npc', npc: 'st-jersey', cooldown: 90 },
    lines: ['Original Super Eagles jersey! ₦8,000.', 'Flag, vuvuzela, face paint — everything dey!'],
    choices: [
      {
        text: 'Buy the jersey (₦8,000)',
        requires: { minMoney: 8000 },
        lockedHint: 'Need ₦8,000',
        outcomes: [{ text: 'Green-white-green. You wear am on top your shirt immediately. Patriot!', effects: { money: -8000, clout: 3, flag: 'eaglesJersey' } }],
      },
      {
        text: 'Vuvuzela & face paint (₦1,500)',
        requires: { minMoney: 1500 },
        lockedHint: 'Need ₦1,500',
        outcomes: [{ text: 'You blow am once — three people curse you. E sweet you.', effects: { money: -1500, clout: 1 } }],
      },
      { text: 'Ask if na original', outcomes: [{ text: 'He swear with his mama name. The tag talk "Made in Aba". E still fine.' }] },
    ],
  },
  {
    id: 'stadium-jog',
    title: 'Stadium Track',
    speaker: 'Track Coach',
    trigger: { type: 'npc', npc: 'st-coach', cooldown: 150 },
    lines: ['You wan run? Track free for everybody before match time.', 'Four laps na one mile. Oya!'],
    choices: [
      { text: 'Run 4 laps', outcomes: [{ text: 'You run like Blessing Okagbare... for the first lap. Still, e do.', effects: { clout: 2, timeSkip: 1 } }] },
      {
        text: 'Sprint 100m against the coach',
        requires: { minClout: 10 },
        lockedHint: 'Need 10 clout',
        outcomes: [
          { weight: 1, text: '10.9 seconds! Coach check the stopwatch twice: "You don dey train?"', effects: { clout: 6, timeSkip: 0.5 } },
          { weight: 2, text: 'You pull hamstring for 60 metres. Coach dey laugh as he dey massage am.', effects: { clout: -1, timeSkip: 1 } },
        ],
      },
      {
        text: 'Personal training session (₦5,000)',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'Stairs, sprints and push-ups for the empty stand. Six-pack dey come... slowly.', effects: { money: -5000, clout: 4, timeSkip: 1.5 } }],
      },
    ],
  },

  // ======================= AIRPORT =======================
  {
    id: 'airport-checkin',
    title: 'Air Naija Check-in',
    speaker: 'Air Naija Check-in',
    trigger: { type: 'npc', npc: 'ap-checkin', cooldown: 180 },
    lines: ['Good day! Air Naija to Lagos, departure 2pm... by God\'s grace.', 'Passport or ID, please.'],
    choices: [
      {
        text: 'Fly to Lagos & back (₦150,000)',
        requires: { minMoney: 150000 },
        lockedHint: 'Need ₦150,000',
        outcomes: [
          { weight: 2, text: 'Flight delay 3 hours. You land Lagos, buy suya for airport, fly back. You don travel!', effects: { money: -150000, clout: 6, timeSkip: 8 } },
          { weight: 1, text: '"Due to operational reasons" the flight cancel. Refund go come... in 6–8 weeks.', effects: { money: -150000, clout: 1, timeSkip: 5 } },
        ],
      },
      {
        text: 'Business class with protocol (Senators & Ministers)',
        requires: { role: ['senator', 'minister'] },
        lockedHint: 'Only Senators and Ministers (protocol)',
        outcomes: [{ text: 'Protocol carry your bag, VIP lounge get jollof and champagne. Flight even leave on time. Miracle!', effects: { clout: 10, timeSkip: 3 } }],
      },
      { text: 'Ask why the flight dey delay', outcomes: [{ text: 'Agent: "Operational reasons." You see the pilot dey chop for the food court.' }] },
    ],
  },
  {
    id: 'airport-customs',
    title: 'Customs & Immigration',
    speaker: 'Customs Officer',
    trigger: { type: 'npc', npc: 'ap-customs', cooldown: 180 },
    lines: ['Wetin dey your bag? You declare anything?', 'Open am make I see.'],
    choices: [
      {
        text: 'Open your bag honestly',
        outcomes: [
          { weight: 2, text: 'Only clothes and two bags of garri. He wave you go.', effects: { clout: 1 } },
          { weight: 1, text: 'He see three packs of Indomie: "This one na for investigation." The investigation dey for his house.', effects: { clout: -1 } },
        ],
      },
      {
        text: 'Settle am (₦5,000 "for tea")',
        requires: { minMoney: 5000 },
        lockedHint: 'Need ₦5,000',
        outcomes: [{ text: 'He no even open your bag. Your conscience dey look you from corner.', effects: { money: -5000, clout: -3 } }],
      },
      {
        text: '"Corper wee!"',
        requires: { role: ['corper'] },
        lockedHint: 'Only for NYSC Corpers',
        outcomes: [{ text: 'He laugh: "Corper wee-wee! Go, serve your fatherland well."', effects: { clout: 2 } }],
      },
    ],
  },
  {
    id: 'airport-welcome',
    title: 'Welcome Home!',
    speaker: 'Cousin Ada',
    trigger: { type: 'npc', npc: 'ap-relative', cooldown: 300 },
    lines: ['Ahhh! You come pick me! I just land from London!', 'Where your car? I hope say AC dey work.'],
    choices: [
      { text: 'Carry her bags and hug her', outcomes: [{ text: 'She hug you tight: "You don grow!" Na three bags of Indomie dey her box.', effects: { clout: 3 } }] },
      {
        text: 'Take her to Transcorp for lunch (₦30,000)',
        requires: { minMoney: 30000 },
        lockedHint: 'Need ₦30,000',
        outcomes: [{ text: 'Una chop for Transcorp Hilton. She post am: "Abuja don change o!"', effects: { money: -30000, clout: 6, timeSkip: 1.5, teleport: { x: 66, z: -300, heading: 0 } } }],
      },
      {
        text: 'Ask wetin she bring for you',
        outcomes: [
          { weight: 2, text: 'Perfume and two chocolate bars. "Na from Heathrow o!"', effects: { clout: 2 } },
          { weight: 1, text: '"Na me be the gift!" Nothing for you. Classic.' },
        ],
      },
    ],
  },
];
