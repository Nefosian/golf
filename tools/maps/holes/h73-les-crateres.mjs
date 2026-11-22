import { hole } from '../lib.mjs';

// Les Cratères: three lunar craters in a row (gravity 5). Walls at 45°: nothing rests on them, a
// ball goes down slowly and the far wall throws it up in a slow arc. The first two are trenches
// from one wall to the other, with sand at the bottom (a ball that lands there stays); between and
// around them the corridor widens, with sand shoulders where the high arcs come down. The last is
// the deepest, a bowl: a ring of sand, then the green with the cup at its bottom. Low walls (1.6)
// everywhere, so the hole reads at a glance; a shot far too strong can fly out.
export default () => {
  const t = hole('Les Cratères', { theme: 'nuit', par: 4, gravity: 5 });
  const X = 4, XM = 8, X3 = 5, WH = 1.6; // half-widths: the tee's end, the middle, the last crater; wall height
  // a trench across the corridor, half-width w: bottom 2c long at depth -d, walls at 45° up to its
  // rims, 2s apart
  const trench = (cz, w, c, s, d) => {
    t.floor(-w, cz - c, w, cz + c, -d, 'sand');
    t.slab([0, 0, cz + s], [0, -d, cz + c], 2 * w).slab([0, 0, cz - s], [0, -d, cz - c], 2 * w);
  };
  // [z of the near rim, of the far rim]
  const c1 = [-3, -11], c2 = [-19, -26], c3 = [-32, -42], back = c3[1] - 6;
  t.floor(-X, c1[0], X, 2); // the tee's plain
  trench((c1[0] + c1[1]) / 2, X, 2.5, 4, 1.5); // act 1: 8 long, 1.5 deep
  // the middle, 16 wide: grass in line with the craters, sand on the shoulders
  const plain = (z0, z1) => t.floor(-X, z1, X, z0).floor(-XM, z1, -X, z0, 0, 'sand').floor(X, z1, XM, z0, 0, 'sand');
  plain(c1[1], c2[0]);
  trench((c2[0] + c2[1]) / 2, XM, 2.5, 3.5, 1); // act 2: 7 long, 1 deep; the full arc from the tee comes down in it
  plain(c2[1], c3[0]);
  // act 3: the last crater, a 10 x 10 bowl 2.5 deep; its 5 x 5 bottom is a ring of sand round a
  // 3 x 3 green: what rolls down stops in the sand or on the green, then it is a putt
  const cz = (c3[0] + c3[1]) / 2, s = X3, c = 2.5, d = 2.5;
  t.slab([0, 0, cz + s], [0, -d, cz + c], 2 * s).slab([0, 0, cz - s], [0, -d, cz - c], 2 * s)
    .slab([-s, 0, cz], [-c, -d, cz], 2 * s).slab([s, 0, cz], [c, -d, cz], 2 * s);
  t.floor(-1.5, cz - 1.5, 1.5, cz + 1.5, -d);
  t.floor(-c, cz + 1.5, c, cz + c, -d, 'sand').floor(-c, cz - c, c, cz - 1.5, -d, 'sand')
    .floor(-c, cz - 1.5, -1.5, cz + 1.5, -d, 'sand').floor(1.5, cz - 1.5, c, cz + 1.5, -d, 'sand');
  t.floor(-X3, back, X3, c3[1], 0, 'sand'); // behind it, sand: where a shot a little too strong comes down
  // the walls, from below the deepest floor so that nothing rolls out under them
  for (const sx of [-1, 1]) {
    t.block(sx * X - 0.15, c1[1] - 0.15, sx * X + 0.15, 2.15, -3, WH).block(sx * XM - 0.15, c3[0] - 0.15, sx * XM + 0.15, c1[1] + 0.15, -3, WH);
    t.block(sx * X3 - 0.15, back - 0.15, sx * X3 + 0.15, c3[0] + 0.15, -3, WH);
    t.block(Math.min(sx * X, sx * XM), c1[1] - 0.15, Math.max(sx * X, sx * XM), c1[1] + 0.15, -0.5, WH);
    t.block(Math.min(sx * X3, sx * XM), c3[0] - 0.15, Math.max(sx * X3, sx * XM), c3[0] + 0.15, -0.5, WH);
  }
  t.block(-X, 2, X, 2.3, -0.5, WH).block(-X3, back - 0.3, X3, back, -0.5, WH);
  return t.tee(0, 0, 0).cup(0.5, -d, cz - 0.5);
};
