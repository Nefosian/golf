// The map builder: each hole of the pool is a small script in tools/maps/holes/ that calls these
// helpers, and tools/maps/build.mjs writes it to maps/<file>.json (the format physics.Hole reads,
// see "Les cartes et les modificateurs" in README.md). The ball plays towards -Z, y is up, a floor
// is 0.5 thick, a wall 0.3 thick and sunk 0.15 into the floor.

const r4 = v => Math.round(v * 1e4) / 1e4;
export const V = (...a) => a.map(r4);
const FLOOR_T = 0.5, WALL_T = 0.3, WALL_SINK = 0.15;
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
  return t;
}

// emit gives the JSON of a hole, a collider or a zone a line, like the hand-written maps.
export function emit(h) {
  const { name, tee, cup, colliders, zones, ...rest } = h;
  const one = o => JSON.stringify(o).replace(/,/g, ', ').replace(/":/g, '": ');
  const head = Object.entries({ name, tee, cup, ...rest }).map(([k, v]) => `  ${JSON.stringify(k)}: ${one(v)}`);
  let s = '{\n' + head.join(',\n') + ',\n  "colliders": [\n' + colliders.map(o => '    ' + one(o)).join(',\n') + '\n  ]';
  if (zones.length) s += ',\n  "zones": [\n' + zones.map(o => '    ' + one(o)).join(',\n') + '\n  ]';
  return s + '\n}\n';
}
