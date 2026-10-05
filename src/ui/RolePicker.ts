import { ROLES, type Role } from '../player/Roles';
import { $, h, naira, show } from './dom';

/**
 * "Who you be for Abuja?" — pick a life at New Life. Each role sets your
 * starting OPay balance, clout, daily salary, outfit and workplace.
 */
export class RolePicker {
  private root = $('rolepicker');
  private selected: Role | null = null;
  onClick: () => void = () => {};

  get open(): boolean {
    return !this.root.classList.contains('hidden');
  }

  show(onPick: (r: Role) => void, onBack?: () => void): void {
    const r = this.root;
    r.innerHTML = '';
    this.selected = null;
    const go = h('button.btn.primary.rp-go', { type: 'button', disabled: true }, 'Pick a role') as HTMLButtonElement;
    const detail = h('div.rp-detail', {}, h('div.rp-hint', { text: 'Tap a role to see the life wey dey inside.' }));
    const grid = h('div.rp-grid');
    const cards: HTMLElement[] = [];
    const pick = (role: Role, card: HTMLElement) => {
      this.onClick();
      this.selected = role;
      cards.forEach((c) => c.classList.toggle('sel', c === card));
      go.disabled = false;
      go.textContent = `Start as ${role.name} ▸`;
      detail.innerHTML = '';
      detail.append(
        h('div.rp-dname', { style: `--c:${role.color}`, text: role.name }),
        h('div.rp-dblurb', { text: role.blurb }),
        h('div.rp-stats', {},
          h('span', {}, h('b', { text: naira(role.money) }), ' starting OPay balance'),
          h('span', {}, h('b', { text: role.salary ? `${naira(role.salary)}/day` : 'Earn by working' }), role.salary ? ` from ${role.salaryFrom}` : ''),
          h('span', {}, h('b', { text: `${role.clout}` }), ' clout'),
          h('span', {}, '📍 Works at ', h('b', { text: role.workplace.name })),
        ),
        h('div.rp-perk', { text: '★ ' + role.perk }),
      );
    };
    ROLES.forEach((role, i) => {
      const card = h('button.rp-card', { type: 'button', style: `--c:${role.color}`, 'data-role': role.id },
        h('span.rp-num', { text: String((i + 1) % 10) }),
        h('span.rp-name', { text: role.name }),
        h('span.rp-tag', { text: role.tag }),
        h('span.rp-money', { text: naira(role.money) }),
      );
      card.addEventListener('click', () => pick(role, card));
      card.addEventListener('dblclick', () => {
        pick(role, card);
        go.click();
      });
      cards.push(card);
      grid.append(card);
    });
    go.addEventListener('click', () => {
      if (!this.selected) return;
      this.onClick();
      window.removeEventListener('keydown', onKey);
      onPick(this.selected);
    });
    const onKey = (e: KeyboardEvent) => {
      if (!this.open) return window.removeEventListener('keydown', onKey);
      const n = /^Digit(\d)$/.exec(e.code);
      if (n) {
        const i = (Number(n[1]) + 9) % 10;
        pick(ROLES[i], cards[i]);
      } else if (e.code === 'Enter' && this.selected) go.click();
      else if (e.code === 'Escape' && onBack) {
        window.removeEventListener('keydown', onKey);
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    r.append(
      h('div.rp-wrap', {},
        h('div.rp-head', {},
          h('div', {}, h('div.rp-title', { text: 'Who you be for Abuja?' }), h('div.rp-sub', { text: 'Choose your life. Almajiri or Minister — Abuja go test you either way.' })),
          onBack ? h('button.btn.small', { type: 'button', onclick: () => { window.removeEventListener('keydown', onKey); onBack(); } }, '◂ Back') : null,
        ),
        grid,
        h('div.rp-foot', {}, detail, go),
      ),
    );
    show(r, true);
  }

  close(): void {
    show(this.root, false);
    this.root.innerHTML = '';
  }
}
