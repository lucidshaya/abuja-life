import { FURNITURE, type Furniture } from '../player/Home';
import { $, h, naira, show } from './dom';

/** "Jumia" furniture shop on your laptop: buy upgrades for your house. */
export class HouseShop {
  private root = $('shop');
  onClick: () => void = () => {};
  onClose: () => void = () => {};

  get open(): boolean {
    return !this.root.classList.contains('hidden');
  }

  show(owned: string[], money: () => number, buy: (f: Furniture) => string | null): void {
    const render = (toast = '') => {
      const r = this.root;
      r.innerHTML = '';
      const list = h('div.sh-list');
      for (const f of FURNITURE) {
        const have = owned.includes(f.id);
        const btn = h('button.btn.small' + (have ? '' : '.primary'), { type: 'button', disabled: have || money() < f.price }, have ? 'Owned ✓' : money() < f.price ? 'Too costly' : 'Buy') as HTMLButtonElement;
        btn.addEventListener('click', () => {
          this.onClick();
          const err = buy(f);
          render(err ?? `${f.name} delivered! Check your house 🎉`);
        });
        list.append(h('div.sh-row' + (have ? '.owned' : ''), {},
          h('span.sh-ic', { text: f.icon }),
          h('span.sh-mid', {}, h('span.sh-name', { text: f.name }), h('span.sh-desc', { text: f.desc })),
          h('span.sh-price', { text: naira(f.price) }),
          btn,
        ));
      }
      const done = owned.length;
      r.append(h('div.sh-card', {},
        h('div.sh-head', {},
          h('div', {}, h('div.sh-title', { text: 'Jumia Home • Furnish your house' }), h('div.sh-sub', { text: `OPay balance: ${naira(money())} • ${done}/${FURNITURE.length} items` })),
          h('button.btn.small', { type: 'button', onclick: () => this.close() }, 'Close ✕'),
        ),
        toast ? h('div.sh-toast', { text: toast }) : null,
        list,
      ));
      show(r, true);
    };
    render();
  }

  close(): void {
    if (!this.open) return;
    show(this.root, false);
    this.onClose();
  }
}
