import { $, h, show } from './dom';

const KEY = 'abuja-life-onboarded-v1';

/** One-time-ever flags (kept apart from the save so New Life doesn't reset them). */
export function seen(what: 'tutorial' | 'explore'): boolean {
  try {
    return (localStorage.getItem(KEY) ?? '').split(',').includes(what);
  } catch {
    return false;
  }
}

export function markSeen(what: 'tutorial' | 'explore'): void {
  try {
    const list = new Set((localStorage.getItem(KEY) ?? '').split(',').filter(Boolean));
    list.add(what);
    localStorage.setItem(KEY, [...list].join(','));
  } catch {
    /* private mode: it may show again, that's fine */
  }
}

interface Slide {
  img: string;
  title: string;
  pc: string;
  touch: string;
}

const SLIDES: Slide[] = [
  {
    img: 'welcome',
    title: 'Welcome to Abuja Life 🇳🇬',
    pc: 'This na your new life for Abuja. Your job, your house, your OPay account, your wahala and your enjoyment. Every choice you make dey count.',
    touch: 'This na your new life for Abuja. Your job, your house, your OPay account, your wahala and your enjoyment. Every choice you make dey count.',
  },
  {
    img: 'controls',
    title: 'Move, run and talk',
    pc: 'WASD to walk, mouse to look, Shift to run, Space to jump. People with a yellow "!" get gist for you: walk close and press E to talk. F enters cars. B to dance anywhere.',
    touch: 'Drag the left side to walk (push far to run), drag the right side to look around. Talk and Car buttons appear when you are close to someone or a car. 💃🏾 at the top to dance.',
  },
  {
    img: 'phone',
    title: 'Your phone',
    pc: 'Press Q for your phone. OPay holds your money: send, request, buy airtime and NEPA tokens. Messages, Mail (salary slips and memos), Contacts, Music and your Wardrobe dey inside.',
    touch: 'Tap 📱 for your phone. OPay holds your money: send, request, buy airtime and NEPA tokens. Messages, Mail (salary slips and memos), Contacts, Music and your Wardrobe dey inside.',
  },
  {
    img: 'work',
    title: 'Work and hustle',
    pc: 'Go to your workplace and pick the work action from the "Places in…" panel (keys 1–9). Salaries land at 8am. Give cash or sell waza with G. Big places list everything inside them.',
    touch: 'Go to your workplace and tap the work action in the "Places in…" panel. Salaries land at 8am. Give cash or sell waza with the Give button. Big places list everything inside them.',
  },
  {
    img: 'home',
    title: 'Your house and bills',
    pc: 'Your house dey Sunshine Court Estate. Light is prepaid: when units finish, NEPA takes light! Pay service charge every Monday. Use the laptop inside to buy furniture and upgrade your house.',
    touch: 'Your house dey Sunshine Court Estate. Light is prepaid: when units finish, NEPA takes light! Pay service charge every Monday. Use the laptop inside to buy furniture and upgrade your house.',
  },
];

/** Five-page picture manual shown once, the very first time someone starts a life. */
export function showTutorial(touch: boolean, click: () => void, done: () => void): void {
  const root = $('tutorial');
  let i = 0;
  const set = touch ? 'mobile' : 'pc';
  const render = () => {
    const s = SLIDES[i];
    root.innerHTML = '';
    const last = i === SLIDES.length - 1;
    const next = h('button.btn.primary.tu-next', { type: 'button' }, last ? "Let's go! ▸" : 'Next ▸');
    next.addEventListener('click', () => {
      click();
      if (last) finish();
      else {
        i++;
        render();
      }
    });
    root.append(h('div.tu-card', {},
      h('div.tu-img', {}, h('img', { src: `tutorial/${set}-${s.img}.jpg`, alt: s.title, draggable: 'false' }), h('span.tu-step', { text: `${i + 1} / ${SLIDES.length}` })),
      h('div.tu-body', {},
        h('div.tu-title', { text: s.title }),
        h('div.tu-text', { text: touch ? s.touch : s.pc }),
        h('div.tu-foot', {},
          h('div.tu-dots', {}, ...SLIDES.map((_, k) => h('span' + (k === i ? '.on' : '')))),
          i > 0 ? h('button.btn.small.tu-back', { type: 'button', onclick: () => { click(); i--; render(); } }, '◂ Back') : h('button.btn.small.tu-skip', { type: 'button', onclick: () => { click(); finish(); } }, 'Skip'),
          next,
        ),
      ),
    ));
    // Warm up the next picture.
    if (!last) new Image().src = `tutorial/${set}-${SLIDES[i + 1].img}.jpg`;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'Space') (root.querySelector('.tu-next') as HTMLButtonElement | null)?.click();
    else if (e.code === 'ArrowLeft') (root.querySelector('.tu-back') as HTMLButtonElement | null)?.click();
  };
  const finish = () => {
    window.removeEventListener('keydown', onKey, true);
    markSeen('tutorial');
    show(root, false);
    root.innerHTML = '';
    done();
  };
  window.addEventListener('keydown', onKey, true);
  render();
  show(root, true);
}

/** One-time "go explore" card after you first wake up in your house. */
export function showExplore(touch: boolean, click: () => void, openMap: () => void, close: () => void): void {
  const root = $('explore');
  root.innerHTML = '';
  const finish = (map: boolean) => {
    click();
    markSeen('explore');
    show(root, false);
    if (map) openMap();
    else close();
  };
  root.append(h('div.ex-card', {},
    h('div.ex-ic', { text: '🗺️' }),
    h('div.ex-title', { text: 'Oya, explore Abuja!' }),
    h('div.ex-text', { text: touch
      ? 'You dey inside your house. Waka outside and explore the city. Tap 🗺️ Map to see every place and teleport anywhere.'
      : 'You dey inside your house. Waka outside and explore the city. Press M for the map to see every place and teleport anywhere.' }),
    h('div.ex-btns', {},
      h('button.btn.primary', { type: 'button', onclick: () => finish(true) }, 'Open the map ▸'),
      h('button.btn', { type: 'button', onclick: () => finish(false) }, 'I go waka first'),
    ),
  ));
  show(root, true);
}
