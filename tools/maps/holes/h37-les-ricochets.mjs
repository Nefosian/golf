import { hole, V } from '../lib.mjs';

// Les Ricochets: spring plates float on a pond. A ball that falls on one bounces off again with its
// speed kept, like a skimming stone: the run-up sets the length of every hop. Off the quay's edge,
// one hop to a sand bank; then two big plates, or four small ones (a coin over the water), or the
// dike around the pond.
const HOP = 6; // every pad and plate throws up at 6: a hop lasts 0.67 s

// rects tiles the rectangle (x0, z0)-(x1, z1) minus the holes (rectangles inside it), in few boxes.
function rects(x0, z0, x1, z1, holes) {
  const cut = (a, b, i, j) => [...new Set([a, b, ...holes.flatMap(h => [h[i], h[j]])])].sort((p, q) => p - q);
  const xs = cut(x0, x1, 0, 2), zs = cut(z1, z0, 1, 3);
  const inHole = (xa, xb, za, zb) => holes.some(([hx0, hz0, hx1, hz1]) => xa >= Math.min(hx0, hx1) && xb <= Math.max(hx0, hx1) && za >= Math.min(hz0, hz1) && zb <= Math.max(hz0, hz1));
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
  const t = hole('Les Ricochets', { theme: 'quai', par: 4, maxStrokes: 10 });
  const wy = -0.3, W = 0.45, QY = 1; // water level, rails, height of the quay
  const plate = (x0, z0, x1, z1) => { t.floor(x0, z0, x1, z1); t.pad('jumppad', x0, z0, x1, z1, 0, { speed: HOP }); return [x0, z0, x1, z1]; };
  const water = (x0, z0, x1, z1, plates = []) => {
    t.floor(x0, z0, x1, z1, wy);
    for (const [a, b, c, d] of rects(x0, z0, x1, z1, plates))
      t.zone('hazard', { shape: 0, c: V((a + c) / 2, wy + 0.15, (b + d) / 2), h: V((c - a) / 2, 0.15, (d - b) / 2) });
  };

  // act 1: the ball rolls off the raised quay onto a big plate (2 deep: from 2.2 to 9.5 u/s), one hop
  // carries it to the sand bank; it never flies there without the plate
  t.block(-4, 2, 4, -2, -0.5, QY, { kind: 0 });
  t.rail(W, [-4, QY, -2], [-4, QY, 2], [4, QY, 2], [4, QY, -2]);
  water(-6, -2, 6, -7.5, [plate(-2.5, -2.6, 2.5, -4.6)]);
  t.floor(-6, -7.5, 6, -12, 0, 'sand');
  t.pad('checkpoint', -6, -9.4, 6, -10.2, 0, { at: [1, 0, -9.8] }); // a band across the sand

  // behind the sand, a grass apron: two launch strips on the pond, and the dike to the west
  const big = [1.5, 4.5], small = [-2.6, -1.4], sz = -14.5; // strips, the apron's north edge
  t.floor(-11, -12, 6, sz);
  t.pad('jumppad', big[0], sz + 0.5, big[1], sz, 0, { speed: HOP }).pad('jumppad', small[0], sz + 0.5, small[1], sz, 0, { speed: HOP });
  t.rail(W, [-6, 0, sz], [small[0], 0, sz]).rail(W, [small[1], 0, sz], [big[0], 0, sz]).rail(W, [big[1], 0, sz], [6, 0, sz], [6, 0, -7.5]);
  t.rail(W, [-6, 0, -7.5], [-6, 0, -12], [-11, 0, -12]);

  // act 2: two big plates every 5 (a run-up of 7.5); act 3: four small ones (1.2 × 1.4) every 3.2 (4.8)
  const e = sz + 0.5, plates = [];
  for (const k of [0, 1]) plates.push(plate(big[0], e - 3.31 - 5 * k, big[1], e - 5.81 - 5 * k));
  for (const k of [0, 1, 2, 3]) plates.push(plate(small[0], e - 2.22 - 3.2 * k, small[1], e - 3.62 - 3.2 * k));
  water(-6, sz, 6, -27.5, plates);
  t.zone('strokes', { shape: 1, c: V(-2, 0.85, e - 2.92 - 3.2 * 2.5), r: 0.5, hh: 1.15, once: true, params: { add: -1 } }); // over the water, after the third

  // the safe way: the dike west of the pond, with a chicane, then the green
  t.floor(-11, sz, -6, -27.5).floor(-11, -27.5, 6, -33.5);
  t.rail(W, [-11, 0, -12], [-11, 0, -33.5], [6, 0, -33.5], [6, 0, -27.5]);
  t.rail(W, [-6, 0, sz], [-6, 0, -27.5]);
  t.rail(W, [-6, 0, -19], [-8.5, 0, -19]).rail(W, [-11, 0, -23], [-8.5, 0, -23]);
  return t.tee(0, QY, 0.5).cup(-5, 0, -31);
};
