// Everything before and after a game: who the player is, the rooms to open or to walk into, the
// room with its settings (its owner sets them), and the end of a game (a podium, then every score).
// It shows what net.js knows and sends what the player asks for.
import { game, send } from './net.js';
import { lang, NAMES, setLang, t } from './i18n.js';
import { $, el, ball, button, crown, dialog, windows, copyLink } from './ui.js';

// A player or a room may have no name: these are our words for them.
export const nameOf = p => p.name || t('player', p.id);
export const colorOf = p => game.colors[p.color] ?? '#fff';
const roomName = r => r.name || t('room', r.code);
// heirOf is who gets the room if we leave it: whoever has been there the longest, among those there
export const heirOf = room => room.players.find(p => p.id !== game.me && p.connected);

// ---------------------------------------------------------------------------- the player
// Who we are is kept by the browser and told to the server every time we connect.
let mine = null;
try { mine = JSON.parse(localStorage.getItem('tn-profile')); } catch {}
let nameTimer;

function tell() {
  clearTimeout(nameTimer);
  try { localStorage.setItem('tn-profile', JSON.stringify(mine)); } catch {}
  send({ t: 'profile', name: mine.name, color: mine.color });
}

// welcomed is called once the server knows us: it gets our profile, or gives us the one it has.
export function welcomed() {
  if (mine) tell(); else mine = { ...game.profile };
  if (document.activeElement !== $('me-name')) $('me-name').value = mine.name;
}

$('me-name').addEventListener('input', e => {
  mine.name = e.target.value;
  clearTimeout(nameTimer);
  nameTimer = setTimeout(tell, 350); // not on every key
});

// swatches: the colours, those other players here have crossed out, absent ones too: the server
// keeps their colour for them (unless there are more players than colours: then they are shared)
function swatches(box, color) {
  const others = (game.room?.players ?? []).filter(p => p.id !== game.me);
  const taken = new Set(others.length < game.colors.length ? others.map(p => p.color) : []);
  box.replaceChildren(...game.colors.map((c, i) => {
    const b = el('button', 'ball' + (taken.has(i) ? ' taken' : ''));
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === color);
    b.setAttribute('aria-label', t('me.color', i + 1));
    b.style.setProperty('--c', c);
    if (taken.has(i)) b.setAttribute('aria-disabled', 'true');
    else b.onclick = () => { mine.color = i; tell(); update(); };
    return b;
  }));
}

// showMe fills the "Ton joueur" card and puts it in where: on the home, or in a room over its players.
function showMe(where) {
  const card = $('me');
  if (card.parentElement !== where) where.prepend(card);
  const p = game.room?.players.find(p => p.id === game.me), color = p ? p.color : mine.color;
  $('me-name').placeholder = t('player', game.me);
  $('me-ball').style.setProperty('--c', game.colors[color]);
  swatches($('me-colors'), color);
}

// ---------------------------------------------------------------------------- the home
let listed = '';
function showHome() {
  showMe($('home-side'));
  // the list is asked for every few seconds: only touch the page when it has changed
  if (listed === (listed = JSON.stringify(game.rooms))) return;
  $('rooms-empty').hidden = game.rooms.length > 0;
  $('rooms').replaceChildren(...game.rooms.map(r => {
    const li = el('li'), full = r.players >= r.max;
    li.append(el('span', 'nm', roomName(r)), el('span', 'chip ' + (r.playing ? 'live' : 'open'), t(r.playing ? 'rooms.playing' : 'rooms.lobby')), el('span', 'count', `${r.players}/${r.max}`),
      button(t(full ? 'rooms.full' : 'join'), () => { tell(); send({ t: 'join', code: r.code, listed: true }); }, 'small ' + (full ? 'plain' : 'sun')));
    li.lastChild.disabled = full;
    return li;
  }));
}

// The settings of the last room we opened, for the next one.
let last = null;
try { last = JSON.parse(localStorage.getItem('tn-room')); } catch {}
// the language, chosen here or taken from the browser (i18n.js): its flag, the others under it
const FLAG = {
  fr: '<svg class="flag" viewBox="0 0 3 2" aria-hidden="true"><path fill="#002654" d="M0 0h1v2H0z"/><path fill="#fff" d="M1 0h1v2H1z"/><path fill="#ce1126" d="M2 0h1v2H2z"/></svg>',
  en: '<svg class="flag" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path fill="#012169" d="M0 0h60v30H0z"/><path stroke="#fff" stroke-width="6" d="M0 0l60 30M60 0 0 30"/><path stroke="#c8102e" stroke-width="2" d="M0 0l60 30M60 0 0 30"/><path stroke="#fff" stroke-width="10" d="M30 0v30M0 15h60"/><path stroke="#c8102e" stroke-width="6" d="M30 0v30M0 15h60"/></svg>',
};
const CHEVRON = '<svg class="chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5 11 1.5"/></svg>';
function langMenu(open) {
  $('lang-list').hidden = !open;
  $('lang-btn').setAttribute('aria-expanded', open);
}
function showLang() {
  $('lang-btn').innerHTML = FLAG[lang] + CHEVRON;
  $('lang-btn').title = NAMES[lang];
  $('lang-list').replaceChildren(...Object.keys(NAMES).map(l => {
    const li = el('li'), b = el('button');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', l === lang);
    Object.assign(b, { type: 'button', title: NAMES[l], innerHTML: FLAG[l] });
    b.setAttribute('aria-label', NAMES[l]);
    b.onclick = () => { langMenu(false); setLang(l); showLang(); listed = ''; update(); };
    li.append(b);
    return li;
  }));
}
showLang();
$('lang-btn').onclick = e => { e.stopPropagation(); langMenu($('lang-list').hidden); };
addEventListener('click', e => { if (!$('lang').contains(e.target)) langMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') langMenu(false); });

$('create').onclick = () => {
  tell();
  send({ t: 'create', name: last?.name ?? '', settings: last?.settings });
};
$('code').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('code-input').value.trim();
  if (code) { tell(); send({ t: 'join', code }); }
});
setInterval(() => { if (!game.room && !document.hidden) send({ t: 'rooms' }); }, 3000);

// ---------------------------------------------------------------------------- the room
const LIMITS = { max: [2, 16, 1], strokes: [0, 20, 1], countdown: [10, 600, 10], limit: [1, 10, 1], holes: [1, 100, 1] };

// change sends the room's name and settings with one of them changed (the owner only): the server
// answers with the room, which shows them. Until it has, the next change starts from what was sent
// (current), not from the room it last told (two quick changes would otherwise undo the first); a
// name still being typed (typed) goes with it.
let sent = null, sentAt = 0, typed = null, renameTimer;
const current = () => sent && performance.now() - sentAt < 2000 ? sent : { name: game.room.name, settings: game.room.settings };
function change(key, value) {
  const { name, settings } = current();
  push(typed ?? name, { ...settings, [key]: value });
}
function push(name, settings) {
  clearTimeout(renameTimer);
  typed = null;
  sent = { name, settings };
  sentAt = performance.now();
  send({ t: 'settings', name, settings });
  last = { name, settings };
  try { localStorage.setItem('tn-room', JSON.stringify(last)); } catch {}
}
// the limits of a number: never fewer players than are here, never more holes than to draw from
function bounds(key) {
  const [lo, hi] = LIMITS[key];
  return [key === 'max' ? Math.max(lo, game.room.players.filter(p => p.connected).length) : lo,
    key === 'holes' ? Math.max(1, current().settings.pool.length) : hi];
}
// a number within its limits (strokes: 0 is as each hole says, and so is a word typed in)
function clampNum(key, v) {
  const [bottom, top] = bounds(key);
  return Math.max(bottom, Math.min(top, Math.round(v) || bottom));
}
// fit makes a field followed by its unit as wide as its number, the two centred together
const fit = input => { if (input.nextElementSibling) input.style.width = Math.max(1, input.value.length) + 'ch'; };

for (const seg of document.querySelectorAll('#lobby [data-seg]')) {
  seg.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    const key = seg.dataset.seg, v = b.dataset.v;
    change(key, v === 'true' ? true : v === 'false' ? false : v);
  };
}
for (const box of document.querySelectorAll('#lobby [data-num]')) {
  const key = box.dataset.num, input = box.querySelector('input');
  box.onclick = e => {
    const b = e.target.closest('button');
    if (b) change(key, clampNum(key, current().settings[key] + LIMITS[key][2] * +b.dataset.d));
  };
  if (!input) continue; // the most players: − and + only
  // a typed number is put back within its limits as soon as the field is left (Enter, a click
  // anywhere, Tab), where the player sees it
  const settle = () => {
    const v = clampNum(key, +input.value);
    input.value = v;
    if (v !== current().settings[key]) change(key, v);
  };
  input.addEventListener('change', settle);
  input.addEventListener('blur', settle);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  input.addEventListener('focus', () => input.select()); // "as the hole says" is typed over
  input.addEventListener('input', () => fit(input));
}
$('room-name-input').addEventListener('input', e => {
  typed = e.target.value;
  clearTimeout(renameTimer);
  renameTimer = setTimeout(() => push(typed, current().settings), 400);
});
$('start').onclick = () => send({ t: 'start' });
const pick = () => { search = ''; win.open('picker'); };
$('leave').onclick = () => {
  const room = game.room, heir = heirOf(room);
  win.question(t('leave.ask'), room.owner === game.me && heir ? t('leave.heir', nameOf(heir)) : [t('leave.home')],
    t('leave'), t('stay'), () => send({ t: 'leave' }));
};
$('invite').onclick = async e => {
  const b = e.currentTarget;
  await copyLink();
  b.classList.add('done'); // "copied" in place of "copy", in a button as wide as both
  setTimeout(() => b.classList.remove('done'), 1600);
};

// showStrip shows the course in pictures: the holes drawn from (random: no order, the draw is made at
// the start) or the course in its order (custom), at most 9, then how many more. The owner's last
// tile opens the picker; empty places fill the ten. Drawn again only when what it shows has changed.
const PENCIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></svg>';
let stripShown = '';
function showStrip(s, owner) {
  const list = s.mode === 'random' ? s.pool : s.list, strip = $('strip');
  if (stripShown === (stripShown = JSON.stringify([lang, owner, s.mode, list]))) return;
  const label = t(s.mode === 'random' ? 'pick.random' : 'pick.custom');
  strip.className = list.length ? 'strip' : 'strip empty';
  if (!list.length) { // the others read why above it
    strip.replaceChildren(...owner ? [el('p', '', t(s.mode === 'random' ? 'course.nopool' : 'course.none')), button(label, pick, 'sun small')] : []);
    return;
  }
  const shown = list.slice(0, owner || list.length > 10 ? 9 : 10), rest = list.length - shown.length;
  const tiles = shown.map((m, k) => {
    const tile = el('div', 'hole'), nm = el('span', 'nm');
    if (s.mode === 'custom') nm.append(el('b', '', k + 1));
    nm.append(game.holes[m]);
    tile.title = game.holes[m];
    tile.append(preview(m), nm);
    return tile;
  });
  if (owner) {
    const edit = button('', pick, '');
    edit.className = 'hole edit';
    if (rest) edit.append(el('span', 'n', '+' + rest)); else edit.innerHTML = PENCIL;
    edit.append(el('span', '', label));
    tiles.push(edit);
  } else if (rest) tiles.push(el('div', 'hole more', '+' + rest));
  while (tiles.length < 10) {
    const ghost = el('div', 'hole ghost');
    ghost.setAttribute('aria-hidden', 'true');
    tiles.push(ghost);
  }
  strip.replaceChildren(...tiles);
}

function showRoom() {
  const room = game.room, s = room.settings, owner = room.owner === game.me;
  $('lobby').classList.toggle('owner', owner);
  $('room-name').textContent = roomName(room);
  const nameField = $('room-name-input');
  if (document.activeElement !== nameField) nameField.value = room.name;
  nameField.placeholder = t('room', room.code);
  $('room-code').textContent = room.code;

  showMe($('lobby-side'));
  $('players-title').textContent = t('players.count', room.players.filter(p => p.connected).length, s.max);
  // the seats, then the free places
  const free = Array.from({ length: Math.max(0, s.max - room.players.length) }, () => el('li', 'free'));
  $('seats').replaceChildren(...room.players.map(p => {
    const li = el('li', (p.id === game.me ? 'mine ' : '') + (p.connected ? '' : 'away'));
    li.append(ball(colorOf(p)), el('span', 'nm', nameOf(p) + (p.connected ? '' : t('away'))));
    if (p.id === room.owner) li.append(crown(t('owner')));
    if (p.id !== game.me && owner) {
      const x = button('×', e => {
        e.stopPropagation();
        win.question(t('kick.ask', nameOf(p)), t('kick.text', nameOf(p)), t('kick'), t('cancel'), () => send({ t: 'kick', id: p.id }));
      }, 'x');
      x.setAttribute('aria-label', t('kick'));
      li.append(x);
    }
    return li;
  }), ...free);

  // the settings: controls for the owner, values for the others
  for (const seg of document.querySelectorAll('#lobby [data-seg]')) {
    const v = String(s[seg.dataset.seg]);
    for (const b of seg.children) b.setAttribute('aria-pressed', b.dataset.v === v);
  }
  for (const box of document.querySelectorAll('#lobby [data-num]')) {
    const key = box.dataset.num, [lo, hi] = bounds(key), input = box.querySelector('input');
    box.querySelector('[data-d="-1"]').disabled = s[key] <= lo;
    box.querySelector('[data-d="1"]').disabled = s[key] >= hi;
    if (input && document.activeElement !== input) {
      input.value = key === 'strokes' && !s.strokes ? t('strokes.hole') : s[key];
      fit(input);
    }
  }
  $('room-public').classList.toggle('public', s.public);
  $('room-public').lastChild.textContent = t(s.public ? 'public' : 'private');
  const val = (key, text) => { $('lobby').querySelector(`[data-val=${key}]`).textContent = text; };
  val('collisions', t(s.collisions ? 'yes' : 'no'));
  val('strokes', s.strokes || t('strokes.hole'));
  val('countdown', `${s.countdown} s`);
  val('limit', `${s.limit} min`);
  const drawn = Math.min(s.holes, s.pool.length);
  $('draw').hidden = s.mode !== 'random' || !s.pool.length;
  $('draw-of').textContent = t('draw.of', drawn, s.pool.length);
  const count = s.mode === 'custom' && s.list.length ? t('holes', s.list.length) : '';
  $('course-count').hidden = !count; // an empty one would still take its place in the row
  $('course-count').textContent = count;
  $('course-sum').textContent = s.mode === 'random' ? (s.pool.length ? t('course.drawn', drawn, s.pool.length) : t('course.nopool'))
    : s.list.length ? t('course.of', s.list.length) : t('course.none');
  showStrip(s, owner);
  $('start').disabled = s.mode === 'random' ? !s.pool.length : !s.list.length;
  const ownerP = room.players.find(p => p.id === room.owner);
  $('waiting').replaceChildren(...ownerP ? [ball(colorOf(ownerP)), crown(), el('span', '', t('waiting', nameOf(ownerP)))] : [t('waiting.game')]);
  win.render();
}

// ---------------------------------------------------------------------------- windows
// The one panel: the picker of the holes, for the owner of the room. Questions show over the room.
const win = windows($('front-overlay'), view => view === 'picker' && game.room?.owner === game.me ? ['dim', pickerWindow()] : null);
let search = '';

function head(title) {
  const h = el('div', 'sub-head');
  h.append(el('h2', '', title));
  return h;
}

function pickerWindow() {
  const s = current().settings, q = search.toLowerCase(), found = game.holes.map((n, i) => [n, i]).filter(([n]) => n.toLowerCase().includes(q));
  const finder = el('div', 'tools'), input = el('input', 'field');
  Object.assign(input, { value: search, placeholder: t('search') });
  input.setAttribute('aria-label', t('search'));
  input.oninput = () => { search = input.value; win.render(); const i = document.querySelector('#front-overlay .tools input'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
  finder.append(input);
  const done = button(t('done'), () => win.open(null), 'sun');
  // what a click changes is what was last sent, not what this window was drawn with
  if (s.mode === 'random') {
    const pool = new Set(s.pool), now = () => new Set(current().settings.pool), setPool = p => change('pool', [...p].sort((a, b) => a - b));
    finder.append(button(t('all'), () => setPool(new Set([...now(), ...found.map(([, i]) => i)])), 'small plain'),
      button(t('none'), () => setPool(new Set([...now()].filter(i => !found.some(([, j]) => j === i)))), 'small plain'));
    const list = el('div', 'list maps');
    list.append(...found.map(([n, i]) => {
      const label = el('label', 'map' + (pool.has(i) ? ' on' : '')), box = Object.assign(el('input'), { type: 'checkbox', checked: pool.has(i) });
      box.onchange = () => { const p = now(); if (box.checked) p.add(i); else p.delete(i); setPool(p); };
      const row = el('span', 'row');
      row.append(box, el('span', 'nm', n));
      label.append(preview(i), row);
      return label;
    }));
    const foot = el('div', 'foot');
    foot.append(el('span', 'count', t('holes', pool.size)), done);
    const card = dialog('picker');
    card.append(head(t('draw.title')), finder, list, foot);
    return card;
  }
  const order = s.list, now = () => current().settings.list, setList = l => change('list', l);
  const all = el('div', 'list maps');
  all.append(...found.map(([n, i]) => {
    const b = button('', () => setList([...now(), i]), 'pick');
    b.className = 'map pick';
    const row = el('span', 'row');
    row.append(el('span', 'nm', n), el('span', 'plus', '+'));
    b.append(preview(i), row);
    return b;
  }));
  const course = el('ol', 'order');
  course.append(...order.map((m, k) => {
    const li = el('li'), move = (d, label, sign) => {
      const b = button(sign, () => { const l = [...now()]; [l[k], l[k + d]] = [l[k + d], l[k]]; setList(l); });
      b.className = '';
      b.disabled = !l(k + d);
      b.setAttribute('aria-label', label);
      return b;
    }, l = j => j >= 0 && j < order.length, remove = button('×', () => setList(now().filter((_, j) => j !== k)));
    remove.className = '';
    remove.setAttribute('aria-label', t('remove'));
    li.append(preview(m), el('span', '', game.holes[m]), move(-1, t('up'), '↑'), move(1, t('down'), '↓'), remove);
    return li;
  }));
  const left = el('div', 'pane'), right = el('div', 'pane'), panes = el('div', 'panes'), foot = el('div', 'foot');
  left.append(el('h3', '', t('all.holes')), finder, all);
  right.append(el('h3', '', t('course.count', order.length)), course);
  panes.append(left, right);
  foot.append(el('span'), done);
  const card = dialog('picker custom');
  card.append(head(t('pick.custom')), panes, foot);
  return card;
}

// preview is the picture of the hole, drawn when the game was built (tools/previews); loaded when it
// comes into view, then kept by the browser
function preview(i) {
  const img = Object.assign(el('img', 'preview'), { alt: '', loading: 'lazy' });
  img.draggable = false;
  if (game.previews[i]) img.src = game.previews[i];
  return img;
}

addEventListener('keydown', e => {
  if (e.key !== 'Escape' || document.body.dataset.screen !== 'front') return;
  if (win.ask) win.dismiss(); else if (win.view) win.open(null);
});

// ---------------------------------------------------------------------------- the end of a game
// After the last hole every player sees a podium, then every score, and goes back to the room when
// they like. A new game takes them straight into it.
let ending = null; // null, 'podium' or 'scores'
export const showing = () => ending ? 'end' : 'front';
export function gameOver() {
  ending = 'podium';
  $('end').replaceChildren(); // not the podium of the last game
}
// gameStarted closes what was open before the game: it is not what the player sees when back
export function gameStarted() {
  ending = null;
  win.close();
}

function showEnd() {
  const room = game.room, ranked = [...room.players].filter(p => p.rank).sort((a, b) => a.rank - b.rank || a.total - b.total);
  if (ending === 'podium') {
    const pod = el('div', 'podium'), step = (p, place) => {
      const s = el('div', 'step p' + place), who = el('div', 'who');
      if (!p) return s;
      who.append(ball(colorOf(p)), el('b', '', nameOf(p)), el('span', '', t('strokes', p.total)));
      if (place === 1) s.append(crown());
      s.append(who, el('div', 'block', p.rank)); // tied players share their rank
      return s;
    };
    pod.append(step(ranked[1], 2), step(ranked[0], 1), step(ranked[2], 3));
    const confetti = Array.from({ length: 70 }, (_, i) => {
      const c = el('i', 'confetti');
      Object.assign(c.style, { left: `${(i * 137) % 100}%`, background: game.colors[i % game.colors.length], animationDuration: `${3 + (i % 7) * 0.45}s`, animationDelay: `${1.8 + (i % 11) * 0.25}s` });
      return c;
    });
    $('end').replaceChildren(el('h2', '', t('end.title')), ...confetti, pod, button(t('end.scores'), () => { ending = 'scores'; showEnd(); }, 'sun big next'));
    return;
  }
  const card = el('section', 'card scores'), table = el('table'), top = el('tr');
  top.append(el('th'), el('th', 'who', t('player.col')), ...room.course.map((_, i) => el('th', '', i + 1)), el('th', '', t('total')));
  table.append(top, ...ranked.map(p => {
    const tr = el('tr', p.id === game.me ? 'me' : ''), who = el('td', 'who');
    who.append(ball(colorOf(p)), nameOf(p));
    tr.append(el('td', '', p.rank), who, ...room.course.map((_, i) => el('td', '', p.scores[i] ?? '–')), el('td', 'tot', p.total));
    return tr;
  }));
  const scroll = el('div', 'scroll'), foot = el('div', 'foot');
  scroll.append(table);
  foot.append(button(t('end.back'), () => { ending = null; update(); document.body.dataset.screen = 'front'; }, 'red big'));
  card.append(el('h2', '', t('scores.title', room.course.length)), scroll, foot);
  $('end').replaceChildren(card);
}

// ---------------------------------------------------------------------------- all of it
// update shows the home, the room or the end of a game, as things are. Without the server it shows
// nothing new.
export function update() {
  if (!mine || !game.online) return;
  const room = game.room;
  if (ending && room && !room.playing) {
    if (!$('end').childElementCount || ending === 'podium' && !$('end').querySelector('.podium')) showEnd();
    return;
  }
  ending = null;
  $('home').hidden = !!room;
  $('lobby').hidden = !room;
  if (room) showRoom(); else showHome();
  if (!room || room.playing) win.close(); else win.render(); // what was open in the room goes with it
}

let toastTimer;
export function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
}
