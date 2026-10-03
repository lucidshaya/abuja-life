import './styles.css';
import { Game } from './core/Game';

const TIPS = [
  'Tip: Kubwa expressway jam is worst between 6am and 10am. Plan your life.',
  'Tip: Mallam Musa only fires up the suya grill after 4pm.',
  'Tip: Owambe without aso-ebi? Aunty Funmi go see you.',
  'Tip: Abuja cabs are green and white. One-way drivers no dey wait.',
  'Tip: Drift with the handbrake. Area 1 roundabout is the perfect place.',
  'Tip: Talk to anyone with a yellow ! over their head.',
  'Tip: Your gateman can help you change clothes or sleep till morning.',
];

function fatal(msg: string): void {
  const el = document.getElementById('fatal')!;
  el.classList.remove('hidden');
  el.innerHTML = `<div class="menu-card small"><div class="p-title">Wahala dey o 😅</div><p>${msg}</p><button class="btn primary" onclick="location.reload()">Try again</button></div>`;
  document.getElementById('loading')?.classList.add('hidden');
}

async function boot(): Promise<void> {
  const tip = document.getElementById('load-tip')!;
  tip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const fill = document.getElementById('load-fill')!;
  const msg = document.getElementById('load-msg')!;
  // Stop pinch-zoom and pull-to-refresh hijacking the controls on phones.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if ((e.target as HTMLElement)?.closest?.('.set-scroll, .cz-body, .help-grid')) return;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault());
  let game: Game;
  try {
    game = new Game(canvas);
  } catch (e) {
    console.error(e);
    fatal('Your browser could not start 3D graphics (WebGL). Try Chrome, Edge, Firefox or Safari, and make sure hardware acceleration is on.');
    return;
  }
  await game.init((p, m) => {
    fill.style.width = `${Math.round(p * 100)}%`;
    msg.textContent = m;
  });
  document.getElementById('loading')!.classList.add('hidden');
}

boot().catch((e) => {
  console.error(e);
  fatal('Something broke while loading the city. Refresh to try again.');
});
