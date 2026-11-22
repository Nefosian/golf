// The small builders the menus share, and their windows: front.js before and after a game, hud.js during one.
export const $ = id => document.getElementById(id);
export const el = (tag, className, text) => Object.assign(document.createElement(tag), { className: className ?? '', textContent: text ?? '' });
export const ball = color => { const b = el('i', 'ball'); b.style.setProperty('--c', color); return b; };

export function button(text, onclick, cls = '') {
  const b = el('button', 'btn ' + cls, text);
  b.type = 'button';
  b.onclick = onclick;
  return b;
}

// crown marks the owner of a room; label: what a screen reader says of it, none: it is only a picture
export function crown(label) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('class', 'crown');
  s.setAttribute('viewBox', '0 0 24 24');
  if (label) s.setAttribute('aria-label', label); else s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path d="M3 19 2 7l5.5 4.5L12 4l4.5 7.5L22 7l-1 12Z"/>';
  return s;
}

// dialog is the card of a window over the page
export function dialog(cls, label, role = 'dialog') {
  const card = el('section', 'card modal ' + cls);
  card.setAttribute('role', role);
  if (label) card.setAttribute('aria-label', label);
  return card;
}

// askCard is the window of a question (title, text, okLabel, cancelLabel, ok); close(then) takes it
// away, after doing then if the player said yes.
export function askCard(q, close) {
  const card = dialog('ask', q.title, 'alertdialog'), acts = el('div', 'acts'), p = el('p');
  p.append(...q.text.map(part => typeof part === 'string' ? part : part.cloneNode(true))); // a window drawn again takes copies
  acts.append(button(q.cancelLabel, () => close(), 'plain'), button(q.okLabel, () => close(q.ok), 'red'));
  card.append(el('h2', '', q.title), p, acts);
  return card;
}

// windows are what a screen puts over itself in box: a panel and a question asked over it, each on a
// dim that closes it when clicked. panel(view) gives the look of the dim and the card of the panel
// named view, or null when it cannot be open now: it closes. A question shows with or without a
// panel. Windows drawn again the same (a room message that changes nothing in them) are left as they
// are, with the focus, a slider being dragged and the place typed at; the lists in them keep their scroll.
export function windows(box, panel) {
  const w = {
    view: null, // the panel open, or null
    ask: null,  // the question over it, { title, text, okLabel, cancelLabel, ok }, or null
    open(view) {
      w.view = view;
      w.ask = null;
      w.render();
    },
    // question asks before doing something: in its own window, over a page that does not move
    question(title, text, okLabel, cancelLabel, ok) {
      w.ask = { title, text, okLabel, cancelLabel, ok };
      w.render();
    },
    // dismiss takes the question away, after doing then if the player said yes
    dismiss(then) {
      w.ask = null;
      then?.();
      w.render();
    },
    close() {
      w.view = w.ask = null;
      box.hidden = true;
    },
    render() {
      const shown = w.view && panel(w.view);
      if (!shown) w.view = null;
      if (!w.view && !w.ask) { box.hidden = true; return; }
      const lists = [...box.querySelectorAll('.list, .order')].map(l => l.scrollTop);
      const parts = [];
      if (shown) {
        const [look, card] = shown, dim = el('div', look);
        dim.onclick = () => w.open(null);
        parts.push(dim, card);
      }
      if (w.ask) {
        const dim = el('div', 'dim over');
        dim.onclick = () => w.dismiss();
        parts.push(dim, askCard(w.ask, w.dismiss));
      }
      if (!box.hidden && parts.map(p => p.outerHTML).join('') === box.innerHTML) return;
      box.replaceChildren(...parts);
      box.hidden = false;
      box.querySelectorAll('.list, .order').forEach((l, i) => { l.scrollTop = lists[i] ?? 0; });
    },
  };
  return w;
}

// copyLink puts the address of the page, the room's link, in the clipboard.
export async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href);
  } catch { // no clipboard without https: the old way
    const input = Object.assign(el('input'), { value: location.href });
    document.body.append(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
}
