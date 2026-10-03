type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

/** Minimal DOM builder: h('button.primary', { onclick }, 'Play'). */
export function h(sel: string, attrs: Attrs = {}, ...children: (Node | string | null | undefined | false)[]): HTMLElement {
  const [tagPart, ...classes] = sel.split('.');
  const [tag, id] = tagPart.split('#');
  const el = document.createElement(tag || 'div');
  if (id) el.id = id;
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el;
}

export function show(el: HTMLElement, on = true): void {
  el.classList.toggle('hidden', !on);
}

export function naira(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}
