import { hole, V } from '../lib.mjs';

// Feu Croisé: three cannons answer each other over a lagoon, under a light gravity (8): their arcs
// last 3 s and cross mid-air at the same height. Cannon A (quay to north-east), B (south-east to
// north-west), C (north-west to the green): players at different stages fire through each other.
// A fourth cannon, at the end of a narrow plank, lobs short onto the sand bank under the crossing.
const G = 8, VY = 12, T = 2 * VY / G; // every arc: 12 up, 3 s

// rects tiles the rectangle (x0, z0)-(x1, z1) minus the holes (rectangles inside it), in few boxes.
function rects(x0, z0, x1, z1, holes) {
  const lo = h => [Math.min(h[0], h[2]), Math.min(h[1], h[3]), Math.max(h[0], h[2]), Math.max(h[1], h[3])];
  holes = holes.map(lo);
  const cut = (a, b, i, j) => [...new Set([a, b, ...holes.flatMap(h => [h[i], h[j]])])].sort((p, q) => p - q);
  const xs = cut(Math.min(x0, x1), Math.max(x0, x1), 0, 2), zs = cut(Math.min(z0, z1), Math.max(z0, z1), 1, 3);
  const inHole = (xa, xb, za, zb) => holes.some(([hx0, hz0, hx1, hz1]) => xa >= hx0 && xb <= hx1 && za >= hz0 && zb <= hz1);
  const out = [];
  for (let j = 0; j + 1 < zs.length; j++) {
    let run = null;
    for (let i = 0; i < xs.length; i++) {
      const free = i + 1 < xs.length && !inHole(xs[i], xs[i + 1], zs[j], zs[j + 1]);
      if (free) { run ??= xs[i]; continue; }
      if (run !== null) {
        const prev = out.find(r => r[0] === run && r[2] === xs[i] && r[3] === zs[j]); // same run in the row below: grow it
        if (prev) prev[3] = zs[j + 1]; else out.push([run, zs[j], xs[i], zs[j + 1]]);
      }
      run = null;
    }
  }
  return out;
}

export default () => {
  const t = hole('Feu Croisé', { theme: 'nuit', par: 4, maxStrokes: 10, gravity: G });
  const wy = -0.3, W = 0.45;
  const land = []; // every floor over the lagoon, cut out of the water
  const deck = (x0, z0, x1, z1, material) => { t.floor(x0, z0, x1, z1, 0, material); land.push([x0, z0, x1, z1]); };
  // a cannon at (x, z) whose arc comes down on (tx, tz) 3 s later
  const cannon = (x, z, tx, tz) => t.disc('launcher', x, z, 0.6, 0, { v: V((tx - x) / T, VY, (tz - z) / T) });
  const band = (x0, z0, x1, z1, at) => t.pad('checkpoint', x0, z0, x1, z1, 0, { at });

  // the quay, cannon A; the narrow plank north to the fourth cannon
  deck(-12, 0, -6, -5);
  t.rail(W, [-10, 0, -5], [-12, 0, -5], [-12, 0, 0], [-6, 0, 0], [-6, 0, -5], [-9, 0, -5]);
  cannon(-6.9, -2, 8.3, -18.8);
  deck(-10, -5, -9, -10.8); // 1 wide, no rails, straight ahead of the tee
  // east: A's sand landing, an alley with rails down to cannon B
  deck(7, -17, 11, -22, 'sand'); deck(7, -6, 11, -17);
  t.rail(W, [7, 0, -17], [7, 0, -6], [11, 0, -6], [11, 0, -17]); // the sand landing has no rails: one can fall off it
  band(7, -19.2, 11, -20, [9, 0, -19.6]); // across the slide of a landing ball
  cannon(9, -7.5, -9.6, -18.6);
  // north-west: B's sand landing, cannon C on its grass edge
  deck(-12, -16.5, -8.5, -22, 'sand'); deck(-8.5, -16.5, -6.5, -22);
  t.fence(-12, -16.5, -6.5, -22);
  band(-10.6, -16.5, -10, -22, [-10.3, 0, -19]);
  cannon(-7.5, -19.25, -1.1, -4.6);
  // the sand bank under the crossing, its ford to the green; C lands on the green's sand corner
  deck(-0.5, -11, 2.5, -14, 'sand');
  band(-0.5, -12.2, 2.5, -13, [1, 0, -12.6]);
  deck(0.4, -6, 1.6, -11);
  t.rail(W, [0.4, 0, -6], [0.4, 0, -11]).rail(W, [1.6, 0, -6], [1.6, 0, -11]);
  deck(-3, 0, 4, -2.5); deck(0.4, -2.5, 4, -6); deck(-3, -2.5, 0.4, -6, 'sand');
  t.rail(W, [0.4, 0, -6], [-3, 0, -6], [-3, 0, 0], [4, 0, 0], [4, 0, -6], [1.6, 0, -6]);
  // the fourth cannon, at the end of the plank: a short lob onto the middle of the bank
  t.disc('launcher', -9.5, -10.1, 0.45, 0, { v: V((1 + 9.5) / T, VY, (-12.6 + 10.1) / T) });

  // the lagoon
  // its floor everywhere but under the land (nothing under the cup); three hazards, all but the green
  for (const [a, b, c, d] of rects(-13, 0, 13, -24, land)) t.floor(a, b, c, d, wy);
  for (const [a, b, c, d] of [[-13, 0, -3, -24], [-3, -6, 4, -24], [4, 0, 7, -24], [11, 0, 13, -24]])
    t.zone('hazard', { shape: 0, c: V((a + c) / 2, wy + 0.15, (b + d) / 2), h: V((c - a) / 2, 0.15, Math.abs(d - b) / 2) });
  return t.tee(-9.5, 0, -1.5).cup(3.2, 0, -1);
};
