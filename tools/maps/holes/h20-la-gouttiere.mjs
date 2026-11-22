import { hole, V } from '../lib.mjs';

// La Gouttière: a half-pipe 32 long. Whatever lies across its flat bottom is passed by riding up
// the walls: a slanted shot makes the ball sway from one wall to the other, like a skater. One
// block, then a sand pit across the bottom, then two staggered blocks, right then left, and the cup
// just behind them, in a crown of posts open towards the sandy end of the pipe: whatever comes
// down the pipe stops in the sand and the cup is putted from there. The coin is behind the tee, up
// the east wall, in sand: it costs a shot.
export default () => {
  const t = hole('La Gouttière', { theme: 'canyon', par: 4 });
  const B = 1, X = 4, H = 3 * Math.tan(18 * Math.PI / 180); // half-width of the bottom, of the pipe; wall height
  const zb = 5, z0 = 2, zEnd = -33, zp = -14.3, zp1 = -16.3, zs = -29.700000000000003; // ends of the pipe, of the sand pit; start of the end sand
  t.floor(-B, z0, B, zb, 0, 'sand').floor(-B, zp, B, z0).floor(-B, zp1, B, zp, 0, 'sand').floor(-B, zs, B, zp1).floor(-B, zEnd, B, zs, 0, 'sand');
  const zm = (z0 + zs) / 2, L = z0 - zs, ze = (zs + zEnd) / 2, Le = zs - zEnd;
  t.slab([B, 0, zm], [X, H, zm], L).slab([-B, 0, zm], [-X, H, zm], L);
  const zk = (zb + z0) / 2, Lk = zb - z0;
  t.slab([B, 0, zk], [X, H, zk], Lk, 'sand').slab([-B, 0, zk], [-X, H, zk], Lk, 'sand'); // behind the tee: sand, and the coin
  t.slab([B, 0, ze], [X, H, ze], Le, 'sand').slab([-B, 0, ze], [-X, H, ze], Le, 'sand'); // the end of the pipe is sand: it stops what comes down
  t.rail(1.6, [X, H, zb], [X, H, zEnd]).rail(1.6, [-X, H, zb], [-X, H, zEnd]);
  t.block(-X - 0.15, zb, X + 0.15, zb + 0.3, -0.5, H + 1.6).block(-X - 0.15, zEnd - 0.3, X + 0.15, zEnd, -0.5, H + 1.6); // the ends
  // the blocks on the bottom
  t.block(-B, -8.25, B, -6.6000000000000005, -0.2, 0.6);
  t.block(-0.2, -23.650000000000002, 2.2, -22, -0.2, 0.8); // right
  t.block(-2.2, -27.500000000000004, 0.2, -26.000000000000004, -0.2, 0.8); // left
  // the cup, behind a crown of posts open towards the end: it is putted from the sand
  const cz = -29.000000000000004;
  for (let a = 0; a <= 180; a += 30) t.post(0.95 * Math.cos(a * Math.PI / 180), cz + 0.95 * Math.sin(a * Math.PI / 180), 0, 0.2, 1.2);
  // the coin, lying on the east wall behind the tee
  const ph = Math.atan2(H, X - B), s = 0.7; // the slope, and how far up it the coin is (share of its width)
  const px = B + (X - B) * s, py = H * s, up = [-Math.sin(ph), Math.cos(ph)];
  t.zone('strokes', { shape: 0, c: V(px + up[0] * 0.25, py + up[1] * 0.25, 3.5), rot: V(0, 0, ph), h: V(0.25, 0.25, 0.6), params: { add: -1 }, once: true });
  return t.tee(0, 0, 0).cup(0, 0, cz);
};
