import { hole } from '../lib.mjs';

// Le Sablier: an hourglass lying on its side, a sequel of La Cuvette. Up top, a funnel of sand at
// 50°: too steep to hold a ball (sand holds to 37°), it lets it run down slowly, like a grain, to a
// grass gutter that leads to the neck, 1 u wide. Out of the neck the ball drops onto a heap of
// sand whose 30° faces hold it; the cup is on the grass at the foot of the heap: a firm putt down.
// The other way is the rim of the glass: a grass path round the east, down two 15° ramps that roll
// a ball on their own, with a terrace between them.
export default () => {
  const t = hole('Le Sablier', { theme: 'canyon', par: 3 });
  const TOP = 4.6, FB = 2.1, W = 2.6, G = 0.5; // the rim, the bottom edge of the funnel's faces, its half-width, the gutter's
  const run = (TOP - FB) / Math.tan(50 * Math.PI / 180); // 2.1: the faces' horizontal run
  const zc = -6.1, zn = -8.1; // the funnel's north end (the neck's mouth), the neck's end
  // the tee platform, solid
  t.block(-W, 3, 6.5, 0, 0, TOP, { kind: 0 });
  // the funnel: south, west and east faces of sand at 50°, a grass gutter 1 wide down the middle,
  // in line with the neck; solid ground under the side faces, down to the gutter's edges
  t.slab([0, TOP, 0], [0, FB, -run], 2 * W, 'sand');
  t.slab([-W, TOP, (zc - 0) / 2], [-W + run, FB, zc / 2], -zc, 'sand');
  t.slab([W, TOP, zc / 2], [W - run, FB, zc / 2], -zc, 'sand');
  t.slab([0, FB, -run], [0, 1.5, zc], 2 * G); // the gutter, 8.5°: a ball rolls on
  t.block(-W, 0, -G, zc, 0, FB).block(G, 0, W, zc, 0, FB);
  t.block(-W, 0, W, zc, 0, 1, { kind: 0 }); // the glass's foot
  // the neck: 1 wide, 2 long, between two solid blocks, under a lintel; its floor goes on down (8.5°)
  t.block(-4, zc, -G, zn, 0, TOP + 0.6).block(G, zc, 4, zn, 0, TOP + 0.6);
  t.slab([0, 1.5, zc], [0, 1.2, zn], 1);
  t.block(-G, zc, G, zn, 2.1, TOP + 0.6); // its lintel: the neck is a tunnel, a ball flying over the funnel does not go through
  // the heap: a flat top of sand 0.15 below the neck, 3.5 long (it stops a ball out of the neck at
  // 9 u/s), faces at 30° down to the grass
  const HT = 1.05, hr = HT / Math.tan(30 * Math.PI / 180), hz = -11.6; // its height, its faces' run, the north edge of its top
  t.floor(-1, hz, 1, zn, HT, 'sand');
  t.slab([0, HT, hz], [0, 0, hz - hr], 2 + 2 * hr, 'sand');
  t.slab([-1, HT, (zn + hz) / 2 - hr / 2], [-1 - hr, 0, (zn + hz) / 2 - hr / 2], zn - hz + hr, 'sand');
  t.slab([1, HT, (zn + hz) / 2 - hr / 2], [1 + hr, 0, (zn + hz) / 2 - hr / 2], zn - hz + hr, 'sand');
  // the bottom of the glass: grass, a sand strip along its north wall
  const zb = -22;
  t.floor(-4, -20.8, 6.5, zn).floor(-4, zb, 6.5, -20.8, 0, 'sand');
  // the rim path: ramp 1 (x 4 to 6.5), the terrace, ramp 2 (x 6.5 to 8.5), each ramp down 2.3 at 15°
  const PY = 2.3, rl = PY / Math.tan(15 * Math.PI / 180); // 8.6
  const r1 = -rl, tn = r1 - 3, r2 = tn - rl; // the end of ramp 1, the terrace's north edge, the end of ramp 2
  t.slab([5.25, TOP, 0], [5.25, PY, r1], 2.5);
  t.block(4, r1, 8.5, tn, 0, PY, { kind: 0 }); // the terrace, solid
  t.slab([7.5, PY, tn], [7.5, 0, r2], 2);
  t.floor(6.5, zb, 8.5, r2);
  const under = (x0, x1, za, ya, zb2, yb) => { // steps of solid ground under a ramp
    for (let i = 0; i < 4; i++) {
      const z0 = za + (zb2 - za) * i / 4, z1 = za + (zb2 - za) * (i + 1) / 4, y = ya + (yb - ya) * (i + 1) / 4;
      t.block(x0, z0, x1, z1, 0, Math.max(0.05, y - 0.6), { kind: 0 });
    }
  };
  under(4, 6.5, 0, TOP, r1, PY);
  under(6.5, 8.5, tn, PY, r2, 0);
  // walls, high along the path: a ball shot up a ramp takes off at its top
  t.rail(1.2, [-W, TOP, 3], [6.5, TOP, 3], [6.5, TOP, 0], [6.5, PY, r1], [8.5, PY, r1], [8.5, PY, tn], [8.5, 0, r2], [8.5, 0, zb]);
  t.block(W, 0, 4, zc, 0, TOP + 0.6); // the glass between the funnel and the path
  t.block(-4, 3, -W, zc, 0, TOP + 0.6); // and on the west
  t.rail(1.2, [4, 0, zn], [4, PY, r1]).rail(1.2, [4, PY, r1], [4, PY, tn], [6.5, PY, tn]); // the path's inner edge, the terrace's north wall
  t.rail(1.2, [6.5, PY, tn], [6.5, 0, r2]); // ramp 2's inner edge
  t.rail(1.5, [-4, 0, zn], [-4, 0, zb], [8.5, 0, zb]); // high: a ball shot hard down the heap takes off
  return t.tee(0, TOP, 1.5).cup(3, 0, -17.5);
};
