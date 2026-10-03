import { TRAVEL, type TravelSpot } from '../world/locations/Locations';
import { $, h, show } from './dom';

export type TravelChoice = TravelSpot | 'gate' | 'stay';

/** "Where you dey go?" — pick one of the built-out locations to teleport to. */
export class TravelMenu {
  private root = $('travel');
  onClick: () => void = () => {};

  get open(): boolean {
    return !this.root.classList.contains('hidden');
  }

  show(mode: 'start' | 'continue' | 'pause', onPick: (c: TravelChoice) => void, onBack?: () => void): void {
    const r = this.root;
    r.innerHTML = '';
    const pick = (c: TravelChoice) => {
      this.onClick();
      this.hide();
      onPick(c);
    };
    const first =
      mode === 'start'
        ? this.card({ name: 'Abuja City Gate', area: 'Start here', desc: 'Begin your Abuja story under the famous gate. Uncle Emeka dey wait.', color: '#0f7a45', featured: false }, () => pick('gate'), 'START')
        : mode === 'continue'
          ? this.card({ name: 'Continue where you stopped', area: 'Your last spot', desc: 'Pick up right where you left off.', color: '#3a4250', featured: false }, () => pick('stay'), 'RESUME')
          : null;
    const featured = TRAVEL.filter((t) => t.featured);
    const others = TRAVEL.filter((t) => !t.featured);
    r.append(
      h('div.travel-card', {},
        h('div.travel-head', {},
          h('div', {}, h('div.travel-title', { text: 'Where you dey go?' }), h('div.travel-sub', { text: 'Teleport straight there. You can still drive between places.' })),
          onBack ? h('button.btn.small', { type: 'button', onclick: () => { this.onClick(); this.hide(); onBack(); } }, 'Back') : null,
        ),
        h('div.travel-scroll', {},
          first ? h('div.travel-grid.one', {}, first) : null,
          h('div.travel-label', { text: 'Featured — fully built out' }),
          h('div.travel-grid.big', {}, ...featured.map((t) => this.card(t, () => pick(t)))),
          h('div.travel-label', { text: 'More places' }),
          h('div.travel-grid', {}, ...others.map((t) => this.card(t, () => pick(t)))),
        ),
      ),
    );
    show(r, true);
  }

  hide(): void {
    show(this.root, false);
  }

  private card(t: Pick<TravelSpot, 'name' | 'area' | 'desc' | 'color' | 'featured'>, fn: () => void, badge?: string): HTMLElement {
    return h('button.tcard' + (t.featured ? '.feat' : ''), { type: 'button', style: `--c:${t.color}`, onclick: fn },
      h('span.tc-band', {}, h('span.tc-area', { text: t.area }), badge || t.featured ? h('span.tc-badge', { text: badge ?? 'FEATURED' }) : null),
      h('span.tc-name', { text: t.name }),
      h('span.tc-desc', { text: t.desc }),
      h('span.tc-go', { text: 'Teleport ▸' }),
    );
  }
}
