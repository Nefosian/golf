// What the server says, and nothing else: the connection, the room, the hole and where every ball
// is at any time. No drawing and no rule of the game here. The protocol is described in
// internal/game/proto.go; this file needs nothing from the page and runs as it is in Node.

export const EVENT = { shot: 1, holed: 2, out: 3, maxed: 4, floor: 5, wall: 6, post: 7, cup: 8, ball: 9, kick: 10, zone: 11, teleport: 12, strokes: 13, gaveUp: 14 };
export const REST = 1, SOLID = 2, HOLED = 4; // flags of a ball once it is at the end of its path

const CATCH_UP = 0.15; // what is late runs this much faster until it is back on time
const MAX_LAG = 15;    // frames: later than that, a ball jumps instead of running after its path
const STALE = 30;      // frames: an event this old (the page was hidden) is not played any more

export const game = {
  online: false,    // connected, and known to the server
  me: 0,            // our player id
  profile: { name: '', color: 0 }, // what the server remembers of us
  colors: [],       // the colors a ball can have: a player's color is an index in them
  holes: [],        // names of the holes
  previews: [],     // the address of each hole's picture, '' for none
  rooms: [],        // the public rooms, as last asked for
  room: null,       // the last "room" message, null when we are in no room
  hole: null,       // the hole being played, or the last one
  balls: new Map(), // player id -> { id, flags, x, y, z, still, ... }, placed by advance
};
// what main.js wants to hear about
export const on = { welcome() {}, rooms() {}, room() {}, hole() {}, event() {}, error() {}, left() {}, stopped() {}, over() {}, replaced() {} };

let ws, seq = -1, retries = 0;
let resumed = null; // the code of the room we were in when the connection dropped: the hole it gives back may be the same
let events = [];                 // announced and still to come: { f, id, kind, value }
let played = new Map();          // those that happened and that a packet may announce again: the ones after its f0, by key
let clock = null, target = null; // hole time minus local time, s: the one we show, and the one of the fastest packet
let late = 0;                    // s: how much later than the fastest the packets came lately; the hole is shown that late
const MAX_BUF = 0.15;            // s: the most the hole waits for slow packets

const local = () => performance.now() / 1000;
const same = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;
const frameNow = () => (local() + clock) * game.hole.fps;
const key = e => `${e.f}:${e.id}:${e.kind}`;

export function connect(url, token) {
  ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => { retries = 0; send({ t: 'hello', token }); };
  ws.onmessage = e => typeof e.data === 'string' ? onJSON(JSON.parse(e.data)) : onPaths(new DataView(e.data));
  ws.onclose = e => {
    game.online = false;
    if (game.room) resumed = game.room.code; // a retry that fails too keeps it
    game.room = null;
    on.room();
    if (e.code === 4000) on.replaced(); // this player is now connected from somewhere else
    // longer after each failure, and not all at the same time when a server restarts: 0.5-1 s, 1-2 s... up to 15-30 s
    else setTimeout(() => connect(url, token), 2 ** Math.min(retries++, 5) * (500 + Math.random() * 500));
  };
}

export const send = m => { if (ws?.readyState === 1) ws.send(JSON.stringify(m)); };

function onJSON(m) {
  if (m.t === 'welcome') {
    game.online = true; game.me = m.id; game.profile = { name: m.name, color: m.color }; game.colors = m.colors; game.holes = m.holes; game.previews = m.previews ?? [];
    on.welcome();
  } else if (m.t === 'rooms') {
    game.rooms = m.rooms;
    on.rooms();
  } else if (m.t === 'room') {
    // it may come before the hole it gives back: only another room, or another hole, ends the resume
    if (!m.playing || m.code !== resumed || m.seq !== seq) resumed = null;
    game.room = m;
    for (const id of game.balls.keys()) if (!m.players.some(p => p.id === id)) game.balls.delete(id);
    on.room();
  } else if (m.t === 'hole') {
    // a new hole: what the server had played of the last one has happened, even where a ball is late
    // (target is a path step behind the server, which plays up to a path step ahead of its clock)
    if (clock !== null && m.seq !== seq) fire(frameNow(), (local() + target) * game.hole.fps + 2 * game.hole.pathStep + 1);
    const again = resumed !== null && m.seq === seq; // given back after a lost connection, not a new hole
    resumed = null;
    game.hole = m.hole; seq = m.seq; game.balls.clear(); events = []; played.clear(); clock = null;
    on.hole(again);
  } else if (m.t === 'left') {
    resumed = null;
    game.room = null;
    on.room();
    on.left(m.reason);
  } else if (m.t === 'stopped') {
    on.stopped();
  } else if (m.t === 'over') {
    on.over();
  } else if (m.t === 'err') {
    resumed = null;
    on.error(m.code);
  }
}

// The paths: where balls are going to be and what is going to happen to them.
function onPaths(d) {
  const hole = game.hole;
  if (!hole || d.getUint8(0) !== 1 || d.getUint16(1, true) !== (seq & 0xffff)) return;
  // f0 is the server's frame rounded up to a path step: one step back, the clock is never ahead of it
  const f0 = d.getUint32(3, true), sample = (f0 - hole.pathStep) / hole.fps - local();
  // Paths that find everything still start the clock. While a ball moves the clock never jumps:
  // it runs a little faster or slower towards the fastest packet, minus how late they come (see advance).
  // A packet more than MAX_LAG late re-seats it then, so that its paths are played from their start,
  // in step with what moves; less, it is followed like a rolling one (a ball that starts late catches
  // up), so that the noise of a frame or two (where in its frame the server was) makes no step.
  const seat = sample - Math.min(late, MAX_BUF);
  if (clock === null || (![...game.balls.values()].some(b => b.path.at(-1).f > frameNow() - b.lag) && Math.abs(seat - clock) * hole.fps > MAX_LAG)) {
    target = sample;
    clock = seat;
    for (const b of game.balls.values()) b.lag = 0;
  } else {
    target = Math.max(target, sample);
    late = Math.max(late, target - sample);
  }
  const now = frameNow();

  let o = 9;
  for (let n = d.getUint16(7, true); n > 0; n--) {
    const id = d.getUint32(o, true), first = f0 + d.getUint16(o + 5, true) * hole.pathStep, count = d.getUint16(o + 7, true);
    let b = game.balls.get(id);
    if (!b) game.balls.set(id, b = { id, path: [], lag: 0, flags: 0, x: 0, y: 0, z: 0, still: true });
    b.flags = d.getUint8(o + 4);
    // a segment replaces what was known from its first position on
    let known = null;
    while (b.path.length && b.path.at(-1).f >= first) { const s = b.path.pop(); if (s.f === first) known = s; }
    for (let i = 0, p = o + 9; i < count; i++, p += 12) {
      const s = { f: first + i * hole.pathStep, x: d.getFloat32(p, true), y: d.getFloat32(p + 4, true), z: d.getFloat32(p + 8, true), jump: i === 0 };
      // it goes on with the path when it starts where the ball was going to be, and is a jump otherwise
      if (i === 0 && known && same(known, s)) s.jump = known.jump;
      b.path.push(s);
    }
    // A ball that waits where this path leaves from, when the path has already left (the packet
    // took its time): it takes the path from there, and catches up.
    let i = b.path.length - count;
    if (same(b, b.path[i])) {
      while (i + 1 < b.path.length && same(b, b.path[i + 1])) i++; // the path may wait there for a while too
      if (i + 1 < b.path.length && b.path[i].f < now - b.lag) b.lag = Math.min(now - b.path[i].f, MAX_LAG);
    }
    o += 9 + count * 12;
  }

  events = events.filter(e => e.f <= f0); // what was announced for later is void
  // no packet announces again what comes before its f0, and they come in order: forgotten
  for (const [k, e] of played) if (e.f <= f0) played.delete(k);
  for (let n = d.getUint16(o, true), p = o + 2; n > 0; n--, p += 11) {
    const e = { f: f0 + d.getUint16(p, true), id: d.getUint32(p + 2, true), kind: d.getUint8(p + 6), value: d.getFloat32(p + 7, true) };
    // a packet that took its time announces again what has already happened here: not twice
    if (!played.has(key(e))) events.push(e);
  }
}

// holeTime is the hole clock (s), what the moving colliders follow; 0 before the first paths.
export const holeTime = () => clock === null ? 0 : local() + clock;

// advance is called once per drawn frame, with the time since the last one: what is late catches
// up, every ball is placed, and what was announced for a ball happens when that ball gets there.
export function advance(dt) {
  if (clock === null) return;
  late *= Math.exp(-dt / 30); // forgets a slow spell in half a minute or so
  const aim = target - Math.min(late, MAX_BUF);
  clock += Math.max(-dt * 0.1, Math.min(dt * CATCH_UP, aim - clock)); // never back in time: slower or faster for a while
  const now = frameNow(), gain = dt * game.hole.fps * CATCH_UP;
  for (const b of game.balls.values()) {
    b.lag = Math.max(0, b.lag - gain);
    place(b, now - b.lag);
  }
  fire(now);
}

// fire hands the page what is due of what was announced: on frame now for a ball late by its lag,
// and anything up to frame upTo whatever the balls show.
function fire(now, upTo = -Infinity) {
  events = events.filter(e => {
    const t = now - (game.balls.get(e.id)?.lag ?? 0);
    if (e.f > Math.max(t, upTo)) return true;
    played.set(key(e), e);
    if (t - e.f < STALE) on.event(e);
    return false;
  });
}

// place puts a ball where its path says it is at frame t: on a straight line between two
// positions, or waiting where it is for a jump.
function place(b, t) {
  const p = b.path;
  while (p.length > 1 && p[1].f <= t) p.shift(); // what is behind is not needed any more
  const a = p[0], q = p[1];
  const k = q && !q.jump && t > a.f ? (t - a.f) / (q.f - a.f) : 0;
  b.x = k ? a.x + (q.x - a.x) * k : a.x;
  b.y = k ? a.y + (q.y - a.y) * k : a.y;
  b.z = k ? a.z + (q.z - a.z) * k : a.z;
  b.still = !q;
}
