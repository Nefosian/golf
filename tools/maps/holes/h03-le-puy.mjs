import { hole } from '../lib.mjs';

// Le Puy: two volcanoes. The little one is a bump across the fairway, with sand passes on its sides;
// the big one carries the cup on its summit, up a 25° flank where nothing rests. A wall at the back
// of the summit stops shots a little long; what falls off its sides lands in the sand below. A wall
// in front of the cup hides it from the flank: you land on the summit, then putt around it.
export default () => {
  const t = hole('Le Puy', { theme: 'canyon', par: 4 });
  const H = 1.4, run = +(H / Math.tan(25 * Math.PI / 180)).toFixed(3); // the big Puy: height, flank run
  const b0 = -9, b1 = b0 - 3, b2 = b0 - 6; // the little Puy: foot, crest (0.6 high), far foot
  const f0 = b2 - 10, s0 = f0 - run, s1 = s0 - 6, end = s1 - 4; // big Puy: foot, summit; the ground behind
  const W = 3; // half-width of the big Puy
  // a slab filled underneath with steps, so no ball rolls under it
  const mound = (za, ya, zb, yb, x0, x1) => {
    t.slab([(x0 + x1) / 2, ya, za], [(x0 + x1) / 2, yb, zb], x1 - x0);
    const k = (yb - ya) / (zb - za), drop = 0.5 * Math.hypot(1, k) + 0.01, n = Math.ceil(Math.abs(zb - za) / 0.25);
    for (let i = 0; i < n; i++) {
      const z0 = za + (zb - za) * i / n, z1 = za + (zb - za) * (i + 1) / n;
      const top = Math.min(ya + k * (z0 - za), ya + k * (z1 - za)) - drop;
      if (top > 0.02) t.block(x0, z0, x1, z1, 0, top);
    }
  };
  t.floor(-8, b0, 8, 2); // the fairway
  t.floor(-8, b2, -5.5, b0, 0, 'sand').floor(5.5, b2, 8, b0, 0, 'sand'); // the sand passes
  mound(b0, 0, b1, 0.6, -5.5, 5.5); mound(b1, 0.6, b2, 0, -5.5, 5.5); // the little Puy
  t.floor(-8, f0, 8, b2); // the foot
  t.floor(-8, s0, -W, f0).floor(W, s0, 8, f0); // beside the flank
  mound(f0, 0, s0, H, -W, W); // the flank
  t.floor(-W, s1, W, s0, H).block(-W, s1, W, s0, 0, H - 0.65); // the summit, solid (but clear of the cup's shaft)
  // a crescent of sand, 2 wide, at the foot of its cliffs (one shot gets out of it); grass beyond
  t.floor(-W - 2, s1, -W, s0, 0, 'sand').floor(W, s1, W + 2, s0, 0, 'sand').floor(-W - 2, s1 - 2, W + 2, s1, 0, 'sand');
  t.floor(-8, s1 - 2, -W - 2, s0).floor(W + 2, s1 - 2, 8, s0).floor(-8, end, 8, s1 - 2);
  t.fence(-8, end, 8, 2);
  t.rail(0.45, [-W, H, s1], [W, H, s1]); // the back wall of the summit
  t.block(-1, s0 - 2.9, 1, s0 - 2.4, H - 0.15, H + 1); // the wall in front of the cup: tall, a ball flying off the crest hits it
  return t.tee(0, 0, 0).cup(0, H, s0 - 4);
};
