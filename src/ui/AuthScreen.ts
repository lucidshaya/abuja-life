import { cleanUsername, emailError, usernameError, type Me, type OnlineBackend } from '../online';
import { $, h, show } from './dom';

/**
 * Sign-up before you can play: just an email and a username.
 */
export class AuthScreen {
  private root = $('auth');
  onClick: () => void = () => {};

  open(backend: OnlineBackend, existing: Me | null, done: (me: Me) => void): void {
    let email = existing?.email ?? '';
    let username = '';
    const r = this.root;
    const card = (...kids: (Node | string | null)[]) => {
      r.innerHTML = '';
      r.append(h('div.au-card', {},
        h('div.logo.small', {}, h('span.l1', { text: 'ABUJA' }), h('span.l2', { text: 'LIFE' })),
        ...kids,
      ));
      show(r, true);
      (r.querySelector('input') as HTMLInputElement | null)?.focus();
    };
    const err = h('div.au-err');
    const setErr = (t: string) => (err.textContent = t);
    const input = (attrs: Record<string, string | number>) => {
      const el = h('input.au-input', attrs) as HTMLInputElement;
      el.addEventListener('keydown', (e) => e.stopPropagation());
      return el;
    };
    const busy = (b: HTMLButtonElement, on: boolean, label: string) => {
      b.disabled = on;
      b.textContent = on ? 'Please wait…' : label;
    };
    const finish = (me: Me) => {
      show(r, false);
      r.innerHTML = '';
      done(me);
    };

    // Step: choose a username (also used when the one you wanted is taken).
    const stepUsername = (note = '') => {
      const u = input({ type: 'text', placeholder: 'username', maxlength: 16, autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', value: username });
      const go = h('button.btn.primary.au-go', { type: 'submit' }, 'Start playing ▸') as HTMLButtonElement;
      const form = h('form.au-form', { novalidate: true }, h('label.au-label', { text: 'Pick your username' }), h('div.au-at', {}, h('span', { text: '@' }), u), h('div.au-hint', { text: 'Other players find you, chat with you and send you money with this name.' }), err, go);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.onClick();
        const name = cleanUsername(u.value);
        const bad = usernameError(name);
        if (bad) return setErr(bad);
        busy(go, true, 'Start playing ▸');
        try {
          await backend.claimUsername(name);
          const me = await backend.session();
          if (me?.username) finish(me);
          else setErr('Could not save your username. Try again.');
        } catch (x) {
          setErr((x as Error).message === 'taken' ? `@${name} is taken. Try another one.` : 'Network wahala. Check your connection and try again.');
        }
        busy(go, false, 'Start playing ▸');
      });
      setErr(note);
      card(h('div.au-title', { text: 'One last thing' }), form);
    };

    const claimOrAsk = async () => {
      try {
        await backend.claimUsername(username);
        const me = await backend.session();
        if (me?.username) return finish(me);
        stepUsername();
      } catch (x) {
        stepUsername((x as Error).message === 'taken' ? `@${username} is taken. Pick another one.` : '');
      }
    };

    // Step: email + username.
    const stepStart = () => {
      const e = input({ type: 'email', placeholder: 'you@email.com', autocomplete: 'email', value: email, inputmode: 'email' });
      const u = input({ type: 'text', placeholder: 'username', maxlength: 16, autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', value: username });
      const go = h('button.btn.primary.au-go', { type: 'submit' }, 'Start playing ▸') as HTMLButtonElement;
      const form = h('form.au-form', { novalidate: true },
        h('label.au-label', { text: 'Email' }), e,
        h('label.au-label', { text: 'Username (new players)' }), h('div.au-at', {}, h('span', { text: '@' }), u),
        h('div.au-hint', { text: backend.live ? 'Your email stays private. Players only see your @username.' : 'Saved on this device.' }),
        err, go);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        this.onClick();
        email = e.value.trim().toLowerCase();
        username = cleanUsername(u.value);
        const bad = emailError(email) ?? (username ? usernameError(username) : null);
        if (bad) return setErr(bad);
        busy(go, true, go.textContent ?? '');
        try {
          const me = await backend.verify(email);
          // Returning player: same email = same account, whatever they typed as username.
          if (me.username) return finish(me);
          if (!username) {
            busy(go, false, 'Start playing ▸');
            return stepUsername();
          }
          await claimOrAsk();
        } catch (x) {
          setErr((x as Error).message || 'Network wahala. Try again.');
          busy(go, false, 'Start playing ▸');
        }
      });
      setErr('');
      card(h('div.au-title', { text: 'Sign up or log in' }), h('div.au-sub', { text: 'New here? Enter your email and pick a username. Played before? Just enter your email to continue on any device.' }), form);
    };

    if (existing && !existing.username) stepUsername();
    else stepStart();
  }
}
