// Everything on screen during a game but the course: the menu (the pause menu, the settings and the
// questions it asks), the rankings (compact at the top right, in full with Tab or a click) and the
// strokes. It shows what net.js knows and sends what the player asks for.
import { game, send, holeTime } from './net.js';
import { setVolume } from './audio.js';
import { nameOf, colorOf, heirOf } from './front.js';
import { t } from './i18n.js';
import { $, el, ball, button, crown, dialog, windows, copyLink } from './ui.js';

// ---------------------------------------------------------------------------- settings
// Kept by the browser. sensitivity multiplies the camera turn; names shows the other players' names.
export const settings = { volume: 100, sensitivity: 100, names: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem('tn-settings'))); } catch {}
const saveSettings = () => { try { localStorage.setItem('tn-settings', JSON.stringify(settings)); } catch {} };
setVolume(settings.volume / 100);

// ---------------------------------------------------------------------------- what is open
// The panels: 'pause', 'settings' or 'full' (the rankings), over the game. peek: the full ranking is
// up only while Tab is held.
const win = windows($('overlay'), view => {
  const room = game.room;
  if (!room?.playing) return null;
  return view === 'pause' ? ['dim', pause(room)] : view === 'settings' ? ['dim', settingsPanel()] : ['dim clear', full(room)];
});
let peek = false, splashPending = false, splashTimer, copied = false;

function open(v) {
  peek = false;
  win.open(v);
}

// ---------------------------------------------------------------------------- the HUD
const me = () => game.room?.players.find(p => p.id === game.me);
// the holes count by their place in the game's course
const holeName = room => t('hole', room.pos + 1, game.holes[room.course[room.pos]]);

// the compact ranking: the leader, the one just ahead of us, us (the first three when we are among them)
function mini(room) {
  const sorted = [...room.players].sort((a, b) => a.rank - b.rank), i = sorted.findIndex(p => p.id === game.me);
  const rows = i < 3 ? sorted.slice(0, 3) : [sorted[0], sorted[i - 1], sorted[i]];
  const here = room.players.filter(p => p.connected), done = here.filter(p => p.finished).length;
  const head = el('div', 'head');
  head.append(el('span', '', t('hole.of', room.pos + 1, room.course.length)), el('span', 'done', t('finished', done, here.length)));
  const list = el('ol');
  list.append(...rows.map(p => {
    const li = el('li', (p.id === game.me ? 'me ' : '') + (p.connected ? '' : 'away'));
    const nm = el('span', 'nm', nameOf(p));
    if (!p.connected) nm.append(el('span', 'aw', t('away')));
    li.append(el('span', 'rk', t('rank', p.rank)), ball(colorOf(p)), nm, el('span', 'ok', p.finished ? '✓' : ''), el('span', 'tt', p.total));
    return li;
  }));
  $('mini').replaceChildren(head, list);
}

// holeStarted shows the name of the hole for a moment. The hole comes before the room that says
// which one it is: update shows it.
const SPLASH = 2.5; // s
// A question asked on the last hole is not one for this one (giving up would give up this one).
export function holeStarted() {
  splashPending = true;
  win.ask = null;
}
export function shot() {
  clearTimeout(splashTimer);
  $('splash').classList.add('gone');
}

// update shows the room as the server last told it
export function update() {
  const room = game.room;
  if (!room?.playing) { win.close(); return; }
  mini(room);
  const p = me();
  $('strokes').hidden = !p;
  if (p) $('strokes-n').replaceChildren(String(p.strokes), el('small', '', '/' + room.maxStrokes));
  if (splashPending) {
    splashPending = false;
    $('splash-n').textContent = t('hole.of.long', room.pos + 1, room.course.length);
    $('splash-t').textContent = game.holes[room.course[room.pos]];
    const g = game.hole.gravity || 18; // a hole of its own gravity says so: the ball flies differently there
    $('splash-m').textContent = t('hole.rules', game.hole.par, room.maxStrokes) + (g < 15 ? ' · ' + t('gravity.low') : g > 21 ? ' · ' + t('gravity.high') : '');
    $('splash').hidden = false;
    $('splash').classList.remove('gone');
    clearTimeout(splashTimer);
    splashTimer = setTimeout(shot, SPLASH * 1000);
  }
  win.render();
}

// frame runs on every drawn frame: the countdown
export function frame() {
  // the end of the hole: shown once a player finished it, or in the last minute it may last
  const room = game.room, end = room?.playing ? Math.min(room.endsAt || Infinity, room.limitAt) : 0;
  let left = end ? Math.ceil(end / game.hole.fps - holeTime()) : 0;
  if (!room?.endsAt && left > 60) left = 0;
  $('timer').hidden = !(left > 0);
  if (left > 0) {
    const t = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if ($('timer-n').textContent !== t) $('timer-n').textContent = t;
  }
}

// ---------------------------------------------------------------------------- the panels
function pause(room) {
  const owner = room.owner === game.me, p = me(), card = dialog('pause', t('menu'));
  card.append(el('h2', '', holeName(room)));
  const stack = el('div', 'stack');
  stack.append(
    button(t('resume'), () => open(null), 'sun'),
    button(t('settings'), () => open('settings')),
    button(t(copied ? 'copied' : 'invite.players'), invite),
    el('div', 'sep'));
  if (p && !p.finished) stack.append(button(t('giveup.button'), () => win.question(t('giveup.ask'),
    [t('giveup.text', room.maxStrokes)],
    t('giveup'), t('cancel'), () => { send({ t: 'giveup' }); open(null); })));
  const heir = heirOf(room);
  stack.append(button(t('leave.button'), () => win.question(t('leave.ask'),
    owner && heir ? t('leave.heir', nameOf(heir)) : [t('leave.kept')],
    t('leave'), t('stay'), () => send({ t: 'leave' })), 'plain'));
  if (owner) stack.append(button(t('stop.button'), () => win.question(t('stop.ask'),
    [t('stop.text', room.pos)],
    t('stop'), t('cancel'), () => send({ t: 'stop' }))));
  card.append(stack);
  return card;
}

async function invite() {
  await copyLink();
  copied = true;
  win.render();
  setTimeout(() => { copied = false; win.render(); }, 1600);
}

function settingsPanel() {
  const card = dialog('pause', t('settings'));
  const head = el('div', 'sub-head'), back = button('‹', () => open('pause'), 'back');
  back.setAttribute('aria-label', t('back.menu'));
  head.append(back, el('h2', '', t('settings')));
  const slider = (label, key, min, max, after) => {
    const row = el('label', 'set'), input = Object.assign(el('input'), { type: 'range', min, max, value: settings[key] });
    input.oninput = () => { settings[key] = +input.value; saveSettings(); after?.(); };
    row.append(el('span', 'k', label), input);
    return row;
  };
  const toggle = (label, on, flip) => {
    const row = el('div', 'set'), sw = el('button', 'switch');
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', on);
    sw.setAttribute('aria-label', label);
    sw.onclick = () => { flip(); win.render(); };
    row.append(el('span', 'k', label), sw);
    return row;
  };
  card.append(head,
    slider(t('volume'), 'volume', 0, 100, () => setVolume(settings.volume / 100)),
    slider(t('sensitivity'), 'sensitivity', 25, 250),
    toggle(t('names'), settings.names, () => { settings.names = !settings.names; saveSettings(); }),
    toggle(t('fullscreen'), !!document.fullscreenElement, () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
    }));
  return card;
}

function full(room) {
  const owner = room.owner === game.me && !peek, card = dialog('full', t('ranking'));
  const head = el('div', 'sub-head');
  head.append(el('h2', '', t('ranking.title', room.pos + 1, room.course.length)));
  if (!peek) head.append(button(t('close'), () => open(null), 'small plain close'));
  const holes = Array.from({ length: room.pos + 1 }, (_, i) => i); // places in the course
  const table = el('table'), top = el('tr');
  top.append(el('th'), el('th', 'who', t('player.col')), ...holes.map(h => el('th', h === room.pos ? 'cur' : '', h + 1)), el('th', '', t('total')));
  if (owner) top.append(el('th'));
  table.append(top);
  for (const p of [...room.players].sort((a, b) => a.rank - b.rank)) {
    const tr = el('tr', (p.id === game.me ? 'me ' : '') + (p.connected ? '' : 'away')), who = el('td', 'who');
    who.append(ball(colorOf(p)), nameOf(p));
    if (p.id === room.owner) who.append(crown(t('owner')));
    if (!p.connected) who.append(' ', el('span', 'chip', t('absent')));
    tr.append(el('td', '', p.rank || '–'), who,
      ...holes.map(h => h === room.pos ? el('td', 'cur', p.strokes + (p.finished ? ' ✓' : '')) : el('td', '', p.scores[h] ?? '–')),
      el('td', 'tot', p.total));
    if (owner) {
      const cell = el('td');
      if (p.id !== game.me) cell.append(button(t('kick'), () => win.question(t('kick.ask', nameOf(p)), t('kick.text', nameOf(p)),
        t('kick'), t('cancel'), () => send({ t: 'kick', id: p.id })), 'kick'));
      tr.append(cell);
    }
    table.append(tr);
  }
  const scroll = el('div', 'scroll');
  scroll.append(table);
  card.append(head, scroll);
  return card;
}

// ---------------------------------------------------------------------------- the player's hand
$('menu-btn').onclick = () => open('pause');
$('mini').onclick = () => open('full');
addEventListener('fullscreenchange', win.render);
addEventListener('keydown', e => {
  if (document.body.dataset.screen !== 'game' || !game.room?.playing) return;
  if (e.key === 'Escape') {
    if (win.ask) win.dismiss(); else if (win.view === 'settings') open('pause'); else open(win.view ? null : 'pause');
  } else if (e.key === 'Tab') {
    e.preventDefault();
    if (!e.repeat && !win.view) { open('full'); peek = true; win.render(); }
  }
});
addEventListener('keyup', e => { if (e.key === 'Tab' && peek) open(null); });
