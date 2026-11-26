// The page: it joins what the server says (net.js) to the picture (scene.js) and the sounds
// (audio.js), and turns the gestures of the player into shots and camera moves.
import { game, on, connect, send, advance, holeTime, EVENT, REST, HOLED } from './net.js';
import { View, describe } from './scene.js';
import { sfx, unlock } from './audio.js';
import { welcomed, update, toast, nameOf, colorOf, showing, gameOver, gameStarted } from './front.js';
import * as hud from './hud.js';
import { t, translate } from './i18n.js';
import { $ } from './ui.js';

translate(); // the page's own words, in the player's language

// the menus are drawn for a UI_W x UI_H window and scaled to this one, as a whole (--ui in style.css)
const UI_W = 1160, UI_H = 780;
function scaleUI() {
  const s = Math.min(1.6, Math.max(0.7, Math.min(innerWidth / UI_W, innerHeight / UI_H)));
  document.documentElement.style.setProperty('--ui', s.toFixed(3));
}
addEventListener('resize', scaleUI);
scaleUI();

// Aiming: a drag backwards picks the line and the power, then the arrow swings around that line
// and the shot leaves where it points when the button is released.
const CANCEL_R = 44;                                        // px around the press point: letting go there is no shot
const DRAG_FULL = () => Math.max(170, innerHeight * 0.32);  // px of drag for full power
const SWING_PERIOD = 1.25;                                  // s for the arrow to go left, right and back
const swingAmp = power => (3 + 12 * power) * Math.PI / 180; // wider on long shots
const MIN_POWER = 0.03;
const SOUND = ['', 'putt', 'holed', 'out', 'maxed', 'floor', 'wall', 'post', 'rim', 'ball', 'post', 'rim', 'ball', '', '']; // by event code

const seconds = () => performance.now() / 1000;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const canvas = $('view'), view = new View(canvas);

const cam = { yaw: 0, pitch: 0.6, dist: 9 }; // what the player chose, around the ball
let shown = [0, 0, 0, cam.pitch, cam.dist];  // what the camera shows: a point, a pitch and a distance
let drag = null;    // an aim in progress: where it started, where it is, and the swing { t0, phase }
let turning = null; // a camera drag in progress: the last place of the pointer
let waiting = 0;    // until when (s) we wait for the answer to our shot

// ---------------------------------------------------------------------------- the server
// A player is a tab: the token brings it back to its seat after a reload or a lost connection.
const token = sessionStorage.token ??= Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
// The room is in the address, to be shared: go walks into the one the address names. The server
// ignores it when it has put us back in our room.
function go() {
  const code = location.hash.slice(1).toUpperCase();
  if (!code || code === game.room?.code) return;
  if (game.room) send({ t: 'leave' });
  send({ t: 'join', code });
}
addEventListener('hashchange', go);

// show puts the right screen up: the game while a hole is played, the end of a game once it is
// over (until the player goes back to the room), what comes before otherwise.
function show() {
  const playing = !!game.room?.playing;
  if (!playing) update();
  document.body.dataset.screen = playing ? 'game' : showing();
}

// home is where we are when in no room: nothing in the address, and the rooms one can walk into.
function home() {
  history.replaceState(null, '', location.pathname);
  send({ t: 'rooms' });
  show();
}

const WHY = ['notfound', 'full', 'busy', 'locked', 'private']; // the errors that send us home, said in i18n.js as why.*
const player = id => game.room?.players.find(p => p.id === id);

// offline: the page stays as it was, but nothing in it can be used until the connection is back
const offline = off => { for (const id of ['front', 'front-overlay', 'end']) $(id).inert = off; };

on.welcome = () => {
  $('status').hidden = true;
  offline(false);
  welcomed();
  if (location.hash.length > 1) go(); else home(); // a room or an error answers go
};
on.rooms = update;
on.left = reason => {
  if (reason === 'closed' || reason === 'kicked') toast(t('left.' + reason));
  home();
};
on.stopped = () => toast(t('stopped'));
on.over = gameOver;
on.replaced = () => { $('status').textContent = t('replaced'); };
on.error = code => {
  if (code === 'shot') { waiting = 0; return; } // not played: the ball was not ours to shoot
  if (code === 'power') { banner(t('pow.no')); return; }
  if (code === 'nocourse') { toast(t('why.nocourse')); return; }
  toast(WHY.includes(code) ? t('why.' + code) : code);
  home();
};

on.room = () => {
  const room = game.room;
  $('status').hidden = game.online;
  if (!game.online) return offline(true);
  show();
  hud.update(); // out of a game, or of the room, its windows close
  if (!room) return;
  history.replaceState(null, '', '#' + room.code);
};

// again: the same hole, given back after a lost connection: the course, the camera and the
// windows stay as they were
on.hole = again => {
  drag = null;
  if (again) return;
  const { tee, cup } = game.hole;
  view.setHole(game.hole);
  cam.yaw = Math.atan2(tee[0] - cup.x, tee[2] - cup.z); // behind the tee, facing the cup
  gameStarted();
  hud.holeStarted();
};

let bannerTimer;
// banner says what happened, a moment; look: '' or 'score good|par|over', a ball in the hole, bigger
function banner(text, look = '') {
  const b = $('banner');
  b.textContent = text;
  b.className = 'hud';
  void b.offsetWidth; // its pop plays again, even on the same look
  b.className = 'hud ' + look;
  b.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { $('banner').hidden = true; }, 2500);
}

on.event = e => {
  const mine = e.id === game.me;
  if (mine && e.kind === EVENT.shot) { waiting = 0; return; } // its sound was played when we let go
  // a bumper, a zone and a teleporter give an index, not a speed: they sound like a firm hit
  const zoned = e.kind >= EVENT.kick && e.kind <= EVENT.teleport;
  sfx[SOUND[e.kind]]?.(zoned ? 6 : e.value, mine ? 1 : 0.5);
  if (mine && (e.kind === EVENT.zone || e.kind === EVENT.teleport)) {
    const zone = game.hole.zones[e.value];
    banner(e.kind === EVENT.teleport ? t('teleported') : describe(zone).text);
    if (zone.once) view.taken(e.value);
  }
  if (e.kind === EVENT.holed) {
    const par = game.hole.par; // value: its strokes
    if (mine) banner(t('score', e.value, par), 'score ' + (e.value === 1 || e.value < par ? 'good' : e.value === par ? 'par' : 'over'));
  } // the others' are not said: with many players it would never stop
  else if (mine && e.kind === EVENT.out) banner(t('out'));
  else if (mine && e.kind === EVENT.maxed) banner(t('maxed'));
  else if (mine && e.kind === EVENT.gaveUp) banner(t('gaveup'));
  else if (e.kind === EVENT.powerGot && mine) { sfx.holed?.(1, 0.6); banner(t('pow.got', hud.powerName(e.value))); }
  else if (e.kind === EVENT.power) { sfx.rim?.(4, mine ? 1 : 0.6); const nm = hud.powerName(e.value); banner(mine ? (e.value <= 5 ? t('pow.armed', nm) : nm + ' !') : t('pow.used', nameOf(game.room.players.find(p => p.id === e.id) ?? {}), nm)); }
  else if (e.kind === EVENT.cursed && mine) { sfx.out?.(1, 0.8); banner(t('pow.hit', hud.powerName(e.value))); }
};

// ---------------------------------------------------------------------------- the player
const myBall = () => game.balls.get(game.me);
const playing = () => game.room?.playing && game.room.players.some(p => p.id === game.me && !p.finished);

// We can shoot a ball that is ours, at rest and out of the cup. The server checks again.
function canAim() {
  const b = myBall();
  return !!(b && playing() && b.still && b.flags & REST && !(b.flags & HOLED) && seconds() > waiting);
}

// aim is the shot the arrow shows at time now, or null inside the cancel circle.
function aim(now) {
  const dx = drag.x - drag.x0, dy = drag.y - drag.y0, len = Math.hypot(dx, dy);
  if (len <= CANCEL_R) return null;
  const power = Math.min(1, (len - CANCEL_R) / DRAG_FULL());
  // pulled back like a slingshot: the ball leaves away from the drag, as the camera sees it
  const s = Math.sin(cam.yaw), c = Math.cos(cam.yaw), line = Math.atan2(c * dx + s * dy, c * dy - s * dx);
  const off = swingAmp(power) * Math.sin(drag.phase + (now - drag.t0) * 2 * Math.PI / SWING_PERIOD);
  const yaw = line + off;
  return { power, yaw, dx: -Math.sin(yaw), dz: -Math.cos(yaw), lined: Math.max(0, 1 - Math.abs(off) / (swingAmp(power) * 0.35)) };
}

function fire() {
  const shot = aim(seconds());
  drag = null;
  if (!shot || shot.power < MIN_POWER || !canAim()) return;
  send({ t: 'shoot', dx: shot.dx, dz: shot.dz, power: shot.power });
  sfx.putt(shot.power, 1); // at once; the ball leaves when the server says so
  waiting = seconds() + 1;
  hud.shot();
}

canvas.addEventListener('pointerdown', e => {
  unlock();
  canvas.setPointerCapture(e.pointerId);
  // the swing starts on one side or the other: a quick flick is not straight by itself
  if (e.button === 0 && !e.ctrlKey && canAim()) drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: seconds(), phase: Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
  else turning = { x: e.clientX, y: e.clientY }; // any other drag turns the camera
});
canvas.addEventListener('pointermove', e => {
  if (drag) { drag.x = e.clientX; drag.y = e.clientY; }
  if (!turning) return;
  const k = hud.settings.sensitivity / 100;
  cam.yaw -= (e.clientX - turning.x) * 0.006 * k;
  cam.pitch = clamp(cam.pitch + (e.clientY - turning.y) * 0.004 * k, 0.12, 1.4);
  turning = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', () => { if (drag) fire(); turning = null; });
canvas.addEventListener('pointercancel', () => { drag = turning = null; });
// A mouse wheel zooms. On a trackpad a two-finger swipe turns (x) and tilts (y), a pinch zooms (the
// browser sends it as ctrl+wheel). Which one is guessed once per gesture, from its first event: a
// wheel starts with a big notch, a swipe with small deltas.
let wheelIsMouse = false, wheelLast = 0;
const zoomBy = k => { cam.dist = clamp(cam.dist * Math.exp(k), 2.5, 40); };
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const t = performance.now();
  if (t - wheelLast > 250) wheelIsMouse = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50);
  wheelLast = t;
  const px = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1, k = hud.settings.sensitivity / 100; // lines, pages -> pixels
  if (e.ctrlKey) zoomBy(e.deltaY * px * 0.01);
  else if (wheelIsMouse) zoomBy(Math.sign(e.deltaY) * 0.1);
  else {
    cam.yaw -= e.deltaX * px * 0.005 * k;
    cam.pitch = clamp(cam.pitch - e.deltaY * px * 0.003 * k, 0.12, 1.4);
  }
}, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------------------------------------------------------------------------- every frame
let last = seconds();
function frame() {
  requestAnimationFrame(frame);
  const now = seconds(), dt = Math.min(0.05, now - last);
  last = now;
  advance(dt);
  if (document.body.dataset.screen !== 'game') return; // nothing to draw
  view.move(holeTime());
  view.setBalls(game.balls, id => { const p = player(id); return p && colorOf(p); },
    id => { // the names of the others, but not over a ball in the cup
      const p = hud.settings.names && id !== game.me && !(game.balls.get(id)?.flags & HOLED) && player(id);
      return p ? nameOf(p) : null;
    });
  hud.frame();
  if (view.lite !== hud.settings.lite) view.setLite(hud.settings.lite);

  // the camera follows our ball while we play the hole, and shows the whole course otherwise
  const b = myBall(), follow = b && playing();
  const want = follow ? [b.x, b.y, b.z, cam.pitch, cam.dist] : [...view.center.toArray(), 0.9, view.radius * 1.25 + 5];
  const k = 1 - Math.exp(-dt * 8);
  shown = shown.map((v, i) => v + (want[i] - v) * k);
  view.look(shown[0], shown[1], shown[2], cam.yaw, shown[3], shown[4]);

  if (drag && !canAim()) drag = null;
  const shot = drag && aim(now);
  // yellow for a putt, red at full power; brighter when the swing passes the middle of the line
  if (shot) view.aim(b.x, b.y - game.hole.ballR, b.z, shot.yaw, 0.3 + shot.power * 3, hud.armedPower() ? 0.78 : 0.15 * (1 - shot.power), 0.5 + shot.lined * 0.2); // an armed power: a violet arrow
  else if (drag) view.armed(b.x, b.y - game.hole.ballR, b.z); // letting go here cancels
  else view.hideAim();
  view.render();
}

window.tn = { game, view, cam }; // for the console
connect((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws', token);
frame();
