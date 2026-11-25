// The map builder: each hole of the pool is a small script in tools/maps/holes/ that calls these
// helpers, and tools/maps/build.mjs writes it to maps/<file>.json (the format physics.Hole reads,
// see "Les cartes et les modificateurs" in README.md). The ball plays towards -Z, y is up, a floor
// is 0.5 thick, a wall 0.3 thick and sunk 0.15 into the floor.

const r4 = v => Math.round(v * 1e4) / 1e4;
export const V = (...a) => a.map(r4);
const FLOOR_T = 0.5, WALL_T = 0.3, WALL_SINK = 0.15;
const CUP_R = 0.45, CUP_KEEP = CUP_R + 0.05, CUP_BOX = 0.8; // the cup, how far other floors keep from it, the half-size of the box it is cut in
export const WALL_H = 0.45;

// frame of the segment a-b ([x, y, z] each): its length, Euler rotation, up vector and middle.
function frame(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], hl = Math.hypot(dx, dz);
  const th = Math.atan2(-dz, dx), ph = Math.atan2(dy, hl);
  return {
    l: Math.hypot(hl, dy), rot: [0, th, ph],
    up: [-Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)],
    mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
  };
}

// hole starts a hole: opts are the hole rules (par, maxStrokes, gravity).
export function hole(name, opts = {}) {
  const h = { name, ...opts, colliders: [], zones: [] };
  const mat = m => (m ? { material: m } : {});
  const t = {
    h,
    // floor is flat, its top at y, between the corners (x0, z0) and (x1, z1).
    floor(x0, z0, x1, z1, y = 0, material) {
      h.colliders.push({ shape: 0, kind: 0, c: V((x0 + x1) / 2, y - FLOOR_T / 2, (z0 + z1) / 2), h: V(Math.abs(x1 - x0) / 2, FLOOR_T / 2, Math.abs(z1 - z0) / 2), ...mat(material) });
      return t;
    },
    // slab is a sloped floor of the given width; the centerline of its top runs from a to b.
    slab(a, b, width, material) {
      const f = frame(a, b);
      h.colliders.push({ shape: 0, kind: 0, c: V(f.mid[0] - f.up[0] * FLOOR_T / 2, f.mid[1] - f.up[1] * FLOOR_T / 2, f.mid[2] - f.up[2] * FLOOR_T / 2), rot: V(...f.rot), h: V(f.l / 2, FLOOR_T / 2, width / 2), ...mat(material) });
      return t;
    },
    // rail is a polyline of walls standing on the floor, height above it; points are [x, y, z]
    // with y the floor there. material: "bumper" for a kicking wall.
    rail(height, ...pts) {
      let material;
      if (typeof pts[pts.length - 1] === 'string') material = pts.pop();
      for (let i = 0; i + 1 < pts.length; i++) {
        const f = frame(pts[i], pts[i + 1]), lift = (height - WALL_SINK) / 2;
        h.colliders.push({ shape: 0, kind: 1, c: V(f.mid[0] + f.up[0] * lift, f.mid[1] + f.up[1] * lift, f.mid[2] + f.up[2] * lift), rot: V(...f.rot), h: V(f.l / 2 + WALL_T / 2, (height + WALL_SINK) / 2, WALL_T / 2), ...mat(material) });
      }
      return t;
    },
    // fence closes the rectangle (x0, z0)-(x1, z1) with walls on a floor at y.
    fence(x0, z0, x1, z1, y = 0, height = WALL_H) {
      return t.rail(height, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y, z0]);
    },
    // block is a solid box from y0 to y1 (a wall by default: kind 1; a floor on top of it is kind 0).
    block(x0, z0, x1, z1, y0, y1, more = {}) {
      h.colliders.push({ shape: 0, kind: 1, c: V((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), h: V(Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2), ...more });
      return t;
    },
    // post is a vertical cylinder standing on a floor at y, height above it.
    post(x, z, y = 0, r = 0.3, height = WALL_H, material) {
      h.colliders.push({ shape: 1, kind: 2, c: V(x, y + (height - WALL_SINK) / 2, z), r, hh: r4((height + WALL_SINK) / 2), ...mat(material) });
      return t;
    },
    // water is a pool: a floor at y (under the course, -0.3 by default) and a hazard over it.
    water(x0, z0, x1, z1, y = -0.3) {
      t.floor(x0, z0, x1, z1, y);
      h.zones.push({ type: 'hazard', shape: 0, c: V((x0 + x1) / 2, y + 0.15, (z0 + z1) / 2), h: V(Math.abs(x1 - x0) / 2, 0.15, Math.abs(z1 - z0) / 2) });
      return t;
    },
    // pad is a box zone lying on the floor at y, 0.5 high.
    pad(type, x0, z0, x1, z1, y = 0, params, more = {}) {
      h.zones.push({ type, shape: 0, c: V((x0 + x1) / 2, y + 0.25, (z0 + z1) / 2), h: V(Math.abs(x1 - x0) / 2, 0.25, Math.abs(z1 - z0) / 2), ...(params ? { params } : {}), ...more });
      return t;
    },
    // disc is a round zone lying on the floor at y, 0.5 high.
    disc(type, x, z, r, y = 0, params, more = {}) {
      h.zones.push({ type, shape: 1, c: V(x, y + 0.25, z), r, hh: 0.25, ...(params ? { params } : {}), ...more });
      return t;
    },
    zone(type, z) { h.zones.push({ type, ...z }); return t; },
    raw(c) { h.colliders.push(c); return t; },
    tee(x, y, z) { h.tee = V(x, y + 0.18, z); return t; },
    cup(x, y, z) { h.cup = { x, y, z, r: 0.45 }; return t; },
  };
  return Object.assign(t, pieces(t));
}

// emit gives the JSON of a hole, a collider or a zone a line, like the hand-written maps.
// ---------------------------------------------------------------------------- track pieces
// Rounded courses are built from pieces, each made of the boxes the engine knows:
//   path   a ribbon of floor between two walls, laid like a track: straights (which may climb or
//          drop, eased at both ends) and flat turns cut in 5° facets;
//   plate  a flat floor with a rounded outline (roundRect, disc), walled, with openings;
//   green  a plate holding the cup;
//   bowl   a flat bottom (the cup at its centre, or not) in a ring of slopes, a flat collar round it.
// Facets of a flat turn, eased ramps and the slopes of a bowl roll as smoothly as one box (measured,
// docs/recherche-parcours.md § 5). Left out on purpose because boxes cannot do them smoothly (the
// floor would have to twist): a slope inside a turn, a banked turn, a half-pipe.
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k], len3 = a => Math.hypot(a[0], a[1], a[2]), unit3 = a => mul3(a, 1 / len3(a));
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Euler XYZ angles (as physics.euler: R = Rx Ry Rz) of the rotation whose columns are the axes x, y, z
// (when z lies along ±X the first and last turns are about the same axis: all of it goes to the last)
const eulerOf = (x, y, z) => Math.abs(z[0]) > 1 - 1e-9
  ? [0, Math.sign(z[0]) * Math.PI / 2, Math.atan2(x[1], y[1])]
  : [Math.atan2(-z[1], z[2]), Math.asin(z[0]), Math.atan2(-y[0], x[0])];
const FACET = 5 * Math.PI / 180; // a turn or a round outline is cut every 5°
const easeIn = f => f * f * (3 - 2 * f);

// box is a floor (kind 0) or a wall (kind 1) along x, standing on up, centred on c
function box(kind, c, x, up, h, more = {}) {
  return { shape: 0, kind, c: V(...c), rot: V(...eulerOf(x, up, cross3(x, up))), h: V(...h), ...more };
}
// floorOn is the floor box under the top face from a to b (its middle line), width wide, length extra
function floorOn(a, b, up, width, length, material) {
  const x = unit3(sub3(b, a)), mid = mul3(add3(a, b), 0.5);
  return box(0, add3(mid, mul3(up, -FLOOR_T / 2)), x, up, [length / 2, FLOOR_T / 2, width / 2], material ? { material } : {});
}
// wallOn is a wall whose inner face runs from a to b, standing on up, its thickness on side (+1: right of a→b)
function wallOn(a, b, up, side, height, material) {
  const x = unit3(sub3(b, a)), right = cross3(x, up), l = len3(sub3(b, a));
  const c = add3(add3(mul3(add3(a, b), 0.5), mul3(right, side * WALL_T / 2)), mul3(up, (height - WALL_SINK) / 2));
  return box(1, c, x, up, [l / 2, (height + WALL_SINK) / 2, WALL_T / 2], material ? { material } : {});
}

// outlines, counterclockwise seen from above, as [x, z] points; each knows how its floor is filled
export function roundRect(x0, z0, x1, z1, r) {
  [x0, x1] = [Math.min(x0, x1), Math.max(x0, x1)]; [z0, z1] = [Math.min(z0, z1), Math.max(z0, z1)];
  const n = Math.max(1, Math.round(Math.PI / 2 / FACET)), pts = [];
  for (const [cx, cz, a0] of [[x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI], [x1 - r, z0 + r, 1.5 * Math.PI]])
    for (let k = 0; k <= n; k++) { const a = a0 + (Math.PI / 2) * k / n; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return Object.assign(pts, { shape: 'roundRect', x0, z0, x1, z1, r });
}
// arc gives the points [x, y, z] of a circle round (cx, cz) from angle a0 to a1 (degrees, from +x
// towards +z), every 5°: for a rail
export function arc(cx, cz, r, a0, a1, y = 0) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 5)), pts = [];
  for (let k = 0; k <= n; k++) { const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]); }
  return pts;
}
// entry is the opening [x, z, width] that a round piece of radius R round (cx, cz) needs for a path w
// wide coming from (fx, fz) and joined with reach: where the path's walls meet the round wall
export function entry(cx, cz, R, fx, fz, w) {
  const l = Math.hypot(fx - cx, fz - cz), ux = (fx - cx) / l, uz = (fz - cz) / l, meet = Math.sqrt(R * R - (w / 2) ** 2);
  return [cx + ux * R, cz + uz * R, 2 * Math.hypot(R - meet, w / 2)];
}
export function disc(cx, cz, r) {
  const n = Math.round(2 * Math.PI / FACET), pts = [];
  for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return Object.assign(pts, { shape: 'disc', cx, cz, r });
}

function pieces(t) {
  const h = t.h, mat = m => (m ? { material: m } : {});
  // fan fills the polygon (corner arc or disc) around (cx, cz) with one box per edge, reaching inward
  // depth (or until clear of the cup by keep): each box lies inside the outline
  const fan = (pts, cx, cz, y, depth, material, cup) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
      let nx = (bz - az) / l, nz = -(bx - ax) / l; // outward: away from (cx, cz)
      if (nx * ((ax + bx) / 2 - cx) + nz * ((az + bz) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
      let d = depth;
      if (cup) d = Math.min(d, (ax - cup[0]) * nx + (az - cup[1]) * nz - CUP_KEEP);
      if (d <= 0.01) continue;
      const c = [(ax + bx) / 2 - nx * d / 2, y - FLOOR_T / 2, (az + bz) / 2 - nz * d / 2];
      h.colliders.push(box(0, c, [(bx - ax) / l, 0, (bz - az) / l], [0, 1, 0], [l / 2 + 1e-3, FLOOR_T / 2, d / 2], mat(material)));
    }
  };
  // walls round a closed outline at height y, but where an opening [x, z, width] cuts it
  const rim = (pts, y, height, open = []) => {
    const ring = [...pts, pts[0]], cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cz = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    for (let i = 0; i + 1 < ring.length; i++) {
      let pieces = [[ring[i], ring[i + 1]]];
      for (const [ox, oz, w] of open) pieces = pieces.flatMap(([a, b]) => clipOut(a, b, ox, oz, w / 2));
      for (const [a, b] of pieces) if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.02)
        { // the wall stands outside the outline: on the side of a→b away from its middle
          const rx = -(b[1] - a[1]), rz = b[0] - a[0], out = rx * ((a[0] + b[0]) / 2 - cx) + rz * ((a[1] + b[1]) / 2 - cz) > 0 ? 1 : -1;
          h.colliders.push(wallOn([a[0], y, a[1]], [b[0], y, b[1]], [0, 1, 0], out, height));
        }
    }
  };
  const fill = (outline, y, material, cup) => {
    if (outline.shape === 'disc') {
      const { cx, cz, r } = outline, apothem = r * Math.cos(FACET / 2);
      if (cup && Math.hypot(cup[0] - cx, cup[1] - cz) > 0.01) throw new Error('a disc holds the cup at its centre only');
      if (cup) h.colliders.push(box(0, [cx, y - FLOOR_T / 2, cz], [1, 0, 0], [0, 1, 0], [CUP_BOX, FLOOR_T / 2, CUP_BOX], mat(material)));
      fan([...outline, outline[0]], cx, cz, y, apothem, material, cup);
      return;
    }
    const { x0, z0, x1, z1, r } = outline;
    if (cup && (cup[0] - CUP_R - 0.05 < x0 + r || cup[0] + CUP_R + 0.05 > x1 - r || cup[1] - CUP_R - 0.05 < z0 || cup[1] + CUP_R + 0.05 > z1))
      throw new Error('the cup must be in the middle column of its roundRect, clear of the rounded sides');
    t.floor(x0 + r, z0, x1 - r, z1, y, material); // the middle column: the one that holds the cup
    if (r > 0) {
      t.floor(x0, z0 + r, x0 + r, z1 - r, y, material);
      t.floor(x1 - r, z0 + r, x1, z1 - r, y, material);
      const n = Math.max(1, Math.round(Math.PI / 2 / FACET)), q = k => outline.slice(k * (n + 1), (k + 1) * (n + 1));
      [[x1 - r, z1 - r], [x0 + r, z1 - r], [x0 + r, z0 + r], [x1 - r, z0 + r]].forEach(([cx, cz], k) => fan(q(k), cx, cz, y, r * Math.cos(FACET / 2), material));
    }
  };
  return {
    // plate is a flat floor of the outline at height y, walled but at the openings ([x, z, width])
    plate(outline, y, { walls = true, wallH = WALL_H, open = [], material } = {}) {
      fill(outline, y, material);
      if (walls) rim(outline, y, wallH, open);
      return t;
    },
    // green is a plate with the cup at (x, z)
    green(outline, y, x, z, opts = {}) {
      fill(outline, y, opts.material, [x, z]);
      if (opts.walls ?? true) rim(outline, y, opts.wallH ?? WALL_H, opts.open ?? []);
      return t.cup(x, y, z);
    },
    // bowl: a flat bottom of radius r0 at y, slopes up to y + depth at r1, a flat collar out to r1 + collar,
    // walled there but at the openings; cup: the cup at its centre. A path joins it on the collar.
    bowl(cx, cz, y, r0, r1, depth, { collar = 1, cup = false, open = [], wallH = WALL_H, material } = {}) {
      fill(disc(cx, cz, r0), y, material, cup ? [cx, cz] : null);
      const n = Math.round(2 * Math.PI / FACET), top = y + depth;
      const at = (r, k, yy) => [cx + Math.cos(2 * Math.PI * k / n) * r, yy, cz + Math.sin(2 * Math.PI * k / n) * r];
      for (let k = 0; k < n; k++) {
        // a slope: the plane through two generators of the cone, a box over the trapezoid between them
        const i0 = at(r0, k, y), i1 = at(r0, k + 1, y), o0 = at(r1, k, top), o1 = at(r1, k + 1, top);
        const m0 = mul3(add3(i0, i1), 0.5), m1 = mul3(add3(o0, o1), 0.5), z = unit3(sub3(m0, m1));
        let x = unit3(sub3(i1, i0)), up = cross3(z, x);
        if (up[1] < 0) { x = mul3(x, -1); up = cross3(z, x); }
        const mid = mul3(add3(m0, m1), 0.5);
        h.colliders.push(box(0, add3(mid, mul3(up, -FLOOR_T / 2)), x, up, [len3(sub3(o1, o0)) / 2 + 1e-3, FLOOR_T / 2, len3(sub3(m1, m0)) / 2], mat(material)));
      }
      const ring = disc(cx, cz, r1 + collar);
      for (let k = 0; k < n; k++) { // the collar, flat
        const a = at(r1, k, top), b = at(r1, k + 1, top), A = [ring[k][0], top, ring[k][1]], B = [ring[(k + 1) % n][0], top, ring[(k + 1) % n][1]];
        const x = unit3(sub3(B, A)), m0 = mul3(add3(a, b), 0.5), m1 = mul3(add3(A, B), 0.5), mid = mul3(add3(m0, m1), 0.5);
        h.colliders.push(box(0, add3(mid, [0, -FLOOR_T / 2, 0]), x, [0, 1, 0], [len3(sub3(B, A)) / 2 + 1e-3, FLOOR_T / 2, len3(sub3(m1, m0)) / 2 + 1e-3], mat(material)));
      }
      rim(ring, top, wallH, open);
      if (cup) t.cup(cx, y, cz);
      return t;
    },
    // geyser is a round jump pad on the floor at y: a ball that touches it leaps (speed: up). Tall, so
    // that a ball falling back on it does not enter it again
    geyser(x, z, y = 0, { r = 0.5, speed = 7 } = {}) {
      h.zones.push({ type: 'jumppad', shape: 1, c: V(x, y + 1, z), r, hh: 1, params: { speed } });
      return t;
    },
    // lowgrav is a field of gravity g over the box (x0, z0)-(x1, z1), from the floor at y up high: a
    // jump in it floats, a slope in it pulls less
    lowgrav(x0, z0, x1, z1, y, g, high = 3) {
      h.zones.push({ type: 'gravity', shape: 0, c: V((x0 + x1) / 2, y + high / 2, (z0 + z1) / 2), h: V(Math.abs(x1 - x0) / 2, high / 2, Math.abs(z1 - z0) / 2), params: { g } });
      return t;
    },
    // vortex is a black hole of radius r round (x, z) on the floor at y: it pulls a ball in (accel) and
    // turns it round (swirl: counterclockwise seen from above when positive)
    vortex(x, z, r, y, { accel = 3, swirl = 2 } = {}) {
      h.zones.push({ type: 'vortex', shape: 1, c: V(x, y + 0.25, z), r, hh: 0.25, params: { at: V(x, y, z), accel, swirl } });
      return t;
    },
    // cannon fires a ball that rolls onto it (a pad of radius r on the floor at y, at x, z) so that it
    // comes down on the floor at 'at' ([x, y, z]) T seconds later
    cannon(x, z, y, at, { T = 1.6, r = 0.6 } = {}) {
      const g = h.gravity ?? 18, v = [(at[0] - x) / T, (at[1] - y + 0.5 * g * T * T) / T, (at[2] - z) / T];
      if (Math.hypot(...v) > 24) throw new Error(`cannon: ${Math.hypot(...v).toFixed(1)} u/s is too fast: give it a shorter flight`);
      return t.disc('launcher', x, z, r, y, { v: V(...v) });
    },
    // slider is a block (x0, z0)-(x1, z1), from the floor at y up height, that slides by move ([dx, dz])
    // and back, every period seconds
    slider(x0, z0, x1, z1, y, height, move, { period = 3, phase = 0 } = {}) {
      return t.raw({ shape: 0, kind: 1, c: V((x0 + x1) / 2, y + (height - WALL_SINK) / 2, (z0 + z1) / 2), rot: [0, 0, 0],
        h: V(Math.abs(x1 - x0) / 2, (height + WALL_SINK) / 2, Math.abs(z1 - z0) / 2),
        motion: { period, phase, move: V(move[0], 0, move[1]), pivot: [0, 0, 0], axis: [0, 0, 0] } });
    },
    // spinner is a bar half long each side of (x, z), on the floor at y, turning round its middle once
    // every period seconds (turn: 1 or -1, the way it turns)
    spinner(x, z, y, half, { period = 4, phase = 0, turn = 1, height = 0.5, thick = 0.3 } = {}) {
      const cy = y + (height - WALL_SINK) / 2;
      return t.raw({ shape: 0, kind: 1, c: V(x, cy, z), rot: [0, 0, 0], h: V(half, (height + WALL_SINK) / 2, thick / 2),
        motion: { period, phase, move: [0, 0, 0], pivot: V(x, cy, z), axis: [0, turn, 0] } });
    },
    // mole is a post of radius r at (x, z) that comes out of the floor at y and goes back, every period:
    // its top low under the floor when down, high over it when up
    mole(x, z, y, { r = 0.55, period = 3, phase = 0, low = 0.05, high = 0.75 } = {}) {
      return t.raw({ shape: 1, kind: 2, c: V(x, y - low - 0.7, z), r, hh: 0.7,
        motion: { period, phase: ((phase % 1) + 1) % 1, move: V(0, low + high, 0), pivot: [0, 0, 0], axis: [0, 0, 0] } });
    },
    // lake fills the box (x0, z0)-(x1, z1) with water at y, but under the rectangles keep ([x0, z0, x1, z1]:
    // islands, roads): the floor in columns, the pools grown as large as they go, so that each has
    // open water in its middle
    lake(x0, z0, x1, z1, keep = [], y = -0.3) {
      const q = v => Math.round(v * 1e4) / 1e4, rs = keep.map(r => [Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.max(r[0], r[2]), Math.max(r[1], r[3])]);
      const cuts = (a, b, k) => [...new Set([a, b, ...rs.flatMap(r => [r[k], r[k + 2]])].map(q))].filter(v => v >= Math.min(a, b) && v <= Math.max(a, b)).sort((u, w) => u - w);
      const xs = cuts(x0, x1, 0), zs = cuts(z0, z1, 1), nx = xs.length - 1, nz = zs.length - 1;
      const inside = (x, z) => rs.some(r => x > r[0] && x < r[2] && z > r[1] && z < r[3]);
      const free = [...Array(nx)].map((_, i) => [...Array(nz)].map((_, j) => !inside((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2)));
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        if (!free[i][j] || (j > 0 && free[i][j - 1])) continue;
        let k = j; while (k + 1 < nz && free[i][k + 1]) k++;
        t.floor(xs[i], zs[j], xs[i + 1], zs[k + 1], y);
      }
      const done = free.map(c => c.map(() => false)), box = (i0, i1, j0, j1) => { for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (!free[i][j]) return false; return true; };
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        if (!free[i][j] || done[i][j]) continue;
        const grow = xFirst => {
          let i0 = i, i1 = i, j0 = j, j1 = j;
          for (const ax of xFirst ? [0, 1] : [1, 0]) {
            if (ax === 0) { while (i0 > 0 && box(i0 - 1, i0 - 1, j0, j1)) i0--; while (i1 + 1 < nx && box(i1 + 1, i1 + 1, j0, j1)) i1++; }
            else { while (j0 > 0 && box(i0, i1, j0 - 1, j0 - 1)) j0--; while (j1 + 1 < nz && box(i0, i1, j1 + 1, j1 + 1)) j1++; }
          }
          return [i0, i1, j0, j1, (xs[i1 + 1] - xs[i0]) * (zs[j1 + 1] - zs[j0])];
        };
        const a = grow(true), b = grow(false), [i0, i1, j0, j1] = a[4] >= b[4] ? a : b;
        for (let u = i0; u <= i1; u++) for (let v = j0; v <= j1; v++) done[u][v] = true;
        const ax = xs[i0], bx = xs[i1 + 1], az = zs[j0], bz = zs[j1 + 1];
        h.zones.push({ type: 'hazard', shape: 0, c: [q((ax + bx) / 2), y + 0.15, q((az + bz) / 2)], h: [q((bx - ax) / 2), 0.15, q((bz - az) / 2)] });
      }
      return t;
    },
    // path lays a ribbon of floor from at ([x, y, z], the middle of its top) towards dir ([dx, dz]),
    // width wide; walls: 'both', 'left', 'right' or 'none' (each piece may say otherwise). Call end().
    path(at, dir, { width = 6, walls = 'both', wallH = WALL_H, material } = {}) {
      let p = [...at], d = [dir[0] / Math.hypot(...dir), dir[1] / Math.hypot(...dir)];
      const s = [{ p: [...p], d: [...d] }]; // samples of the middle line, each with the walls of the span that ends there
      const sides = w => [w === 'both' || w === 'left', w === 'both' || w === 'right'];
      const P = {
        // straight of length l, rising by rise: eased (level at both ends), or not (ease: false, one
        // slope: a kicker)
        straight(l, { rise = 0, ease = true, walls: w = walls } = {}) {
          const n = rise && ease ? Math.max(2, Math.ceil(l / 0.5)) : 1, y0 = p[1];
          for (let k = 1; k <= n; k++) {
            const f = k / n;
            s.push({ p: [p[0] + d[0] * l * f, y0 + rise * (ease ? easeIn(f) : f), p[2] + d[1] * l * f], d: [...d], walls: sides(w) });
          }
          p = [p[0] + d[0] * l, y0 + rise, p[2] + d[1] * l];
          return P;
        },
        // turn by deg (positive: to the left) on a radius r of the middle line, flat
        turn(deg, r, { walls: w = walls } = {}) {
          if (r < width / 2 + 0.5) throw new Error(`turn: radius ${r} is too tight for a path ${width} wide`);
          const A = deg * Math.PI / 180, n = Math.max(1, Math.ceil(Math.abs(A) / FACET)), sg = Math.sign(A);
          const left = [d[1], -d[0]], c = [p[0] + left[0] * r * sg, p[2] + left[1] * r * sg], a0 = Math.atan2(p[2] - c[1], p[0] - c[0]);
          for (let k = 1; k <= n; k++) {
            const a = a0 - A * k / n, q = [c[0] + Math.cos(a) * r, p[1], c[1] + Math.sin(a) * r];
            s.push({ p: q, d: [Math.sin(a) * sg, -Math.cos(a) * sg], walls: sides(w) });
          }
          p = [...s.at(-1).p]; d = [...s.at(-1).d];
          return P;
        },
        // reach goes straight on into a round piece (a bowl's collar, a disc) of radius R round (cx, cz),
        // which it must be heading for: walled until its walls meet the piece's wall, then its floor
        // alone a little further in, but not past radius stop (a bowl's slopes start there)
        reach(cx, cz, R, { stop = 0 } = {}) {
          const ax = cx - p[0], az = cz - p[2], D = Math.hypot(ax, az);
          if (Math.abs(ax * d[1] - az * d[0]) > 0.05 * D) throw new Error('reach: the path is not heading for the centre');
          const meet = Math.sqrt(R * R - (width / 2) ** 2), end = Math.max(stop, meet - 0.3);
          if (end >= meet) throw new Error(`reach: no room to join (stop ${stop} is past ${meet.toFixed(2)})`);
          return P.straight(D - meet).straight(meet - end, { walls: 'none' });
        },
        get end() { return { at: [...p], dir: [...d] }; },
        // done builds the boxes; it gives the end of the path. Both ends must lie on another floor
        // (checked by build.mjs), but an end said open: 'start', 'end' or 'both' (a kicker's lip)
        done({ open } = {}) {
          const from = h.colliders.length, ends = h.ends ??= [];
          const right = q => [-q.d[1], 0, q.d[0]], edge = (q, side) => add3(q.p, mul3(right(q), side * width / 2));
          for (let i = 0; i + 1 < s.length; i++) {
            const a = s[i], b = s[i + 1], x = unit3(sub3(b.p, a.p)), up = cross3(unit3(cross3(x, [0, 1, 0])), x);
            const l = Math.max(len3(sub3(edge(b, -1), edge(a, -1))), len3(sub3(edge(b, 1), edge(a, 1)))) + 2e-3;
            h.colliders.push(floorOn(a.p, b.p, up, width, l, material));
            if (b.walls[0]) h.colliders.push(wallOn(edge(a, -1), edge(b, -1), up, -1, wallH));
            if (b.walls[1]) h.colliders.push(wallOn(edge(a, 1), edge(b, 1), up, 1, wallH));
          }
          const own = [from, h.colliders.length];
          ends.push({ at: s[0].p, open: open === 'start' || open === 'both', own }, { at: p, open: open === 'end' || open === 'both', own });
          return P.end;
        },
      };
      return P;
    },
  };
}
// clipOut is the parts of the segment a-b (points [x, z]) outside the circle (ox, oz, r)
function clipOut(a, b, ox, oz, r) {
  const dx = b[0] - a[0], dz = b[1] - a[1], fx = a[0] - ox, fz = a[1] - oz;
  const A = dx * dx + dz * dz, B = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - r * r, disc = B * B - 4 * A * C;
  if (disc <= 0) return [[a, b]];
  const t0 = (-B - Math.sqrt(disc)) / (2 * A), t1 = (-B + Math.sqrt(disc)) / (2 * A), at = t => [a[0] + dx * t, a[1] + dz * t];
  const out = [];
  if (t0 > 0) out.push([a, at(Math.min(t0, 1))]);
  if (t1 < 1) out.push([at(Math.max(t1, 0)), b]);
  return out;
}

// loose gives the ends of paths that lie on no other floor (but those said open): a path that leads
// into the void, or that turned the wrong way
export function loose(h) {
  const euler = ([x, y, z]) => { const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
    return [c * e, -c * f, d, a * f + b * e * d, a * e - b * f * d, -b * c, b * f - a * e * d, b * e + a * f * d, a * c]; };
  const on = (q, c) => {
    const m = euler(c.rot ?? [0, 0, 0]), r = [q[0] - c.c[0], q[1] - c.c[1], q[2] - c.c[2]];
    const l = [0, 1, 2].map(k => m[k] * r[0] + m[3 + k] * r[1] + m[6 + k] * r[2]); // m transposed: into the box's frame
    return Math.abs(l[0]) <= c.h[0] + 0.05 && Math.abs(l[2]) <= c.h[2] + 0.05 && Math.abs(l[1] - c.h[1]) < 0.35;
  };
  return (h.ends ?? []).filter(e => {
    if (e.open) return false;
    const [a, b] = e.own, q = e.at;
    return !h.colliders.some((c, i) => (i < a || i >= b) && c.kind === 0 && c.shape === 0 && on(q, c));
  }).map(e => e.at.map(v => +v.toFixed(2)));
}

export function emit(h) {
  const { name, tee, cup, colliders, zones, ends, ...rest } = h;
  const one = o => JSON.stringify(o).replace(/,/g, ', ').replace(/":/g, '": ');
  const head = Object.entries({ name, tee, cup, ...rest }).map(([k, v]) => `  ${JSON.stringify(k)}: ${one(v)}`);
  let s = '{\n' + head.join(',\n') + ',\n  "colliders": [\n' + colliders.map(o => '    ' + one(o)).join(',\n') + '\n  ]';
  if (zones.length) s += ',\n  "zones": [\n' + zones.map(o => '    ' + one(o)).join(',\n') + '\n  ]';
  return s + '\n}\n';
}
