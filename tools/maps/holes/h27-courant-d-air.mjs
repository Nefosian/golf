import { hole, V } from '../lib.mjs';

// Courant d'Air: islands over the void, a jumppad at the far edge of each. The wind blows only aloft,
// between 1.5 and 4 above the islands, over the gaps: a small jump passes under it, a big one rises
// into it and drifts sideways, east over the first gap, west and stronger over the second.
export default () => {
  const t = hole("Courant d'Air", { theme: 'bocage', par: 4, maxStrokes: 10 });
  const W = 0.45, L = 0.6; // rail height, pad depth
  const cp = (x0, z0, x1, z1, at) => // a tall checkpoint band: a ball flying in crosses it too
    t.zone('checkpoint', { shape: 0, c: V((x0 + x1) / 2, 1.5, (z0 + z1) / 2), h: V(Math.abs(x1 - x0) / 2, 1.5, Math.abs(z1 - z0) / 2), params: { at } });
  // island to the north: its floor, rails all round (a ball flying in clears the near one) but for a
  // big pad 3 wide in a bay of the far edge, between fins: only a ball rolling towards the edge gets
  // in, and it hops off the edge, never along the pad (a ball that falls back into a pad is thrown up again).
  const island = (x0, z0, x1, z1, bay) => {
    t.floor(x0, z1, x1, z0).rail(W, [x0, 0, z0], [x1, 0, z0]);
    if (!bay) return t.rail(W, [x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0]);
    const [b0, b1] = bay;
    t.rail(W, [x0, 0, z0], [x0, 0, z1], [b0, 0, z1], [b0, 0, z1 + L + 0.4]).rail(W, [b1, 0, z1 + L + 0.4], [b1, 0, z1], [x1, 0, z1], [x1, 0, z0]);
    return t.pad('jumppad', b0, z1, b1, z1 + L, 0, { speed: 10 });
  };
  // the wind over a gap, from 1.5 to 4 high: no floor under its center
  const gust = (x0, z0, x1, z1, ax) => t.zone('wind', { shape: 0, c: V((x0 + x1) / 2, 2.75, (z0 + z1) / 2), h: V((x1 - x0) / 2, 1.25, (z0 - z1) / 2), params: { accel: [ax, 0, 0] } });

  // Act 1, the tee: a small pad in a bay of its east edge hops the ball east, under the wind. Played
  // east, a tee shot cannot also carry north through the next pad and land.
  t.floor(-4, -4, 4, 4).rail(W, [4, 0, -1.5], [4, 0, -4], [-4, 0, -4], [-4, 0, 4], [4, 0, 4], [4, 0, 1.5]);
  t.rail(W, [4, 0, -1.5], [3 , 0, -1.5]).rail(W, [4, 0, 1.5], [3, 0, 1.5]); // the fins of the bay
  t.pad('jumppad', 3.4, -1.5, 4, 1.5, 0, { speed: 7 });
  // Act 2: the island across, its big pad north; the current east carries the jump to the next island.
  t.floor(6.5, -6, 15.5, 4).rail(W, [6.5, 0, -6], [6.5, 0, 4], [15.5, 0, 4], [15.5, 0, -6], [12.5, 0, -6], [12.5, 0, -5]).rail(W, [9.5, 0, -5], [9.5, 0, -6], [6.5, 0, -6]);
  t.pad('jumppad', 9.5, -6, 12.5, -5.4, 0, { speed: 10 });
  cp(6.5, 2, 7.5, -6, [11, 0, 0]);
  gust(4, -6.2, 26, -11.8, 10);
  // Act 3: the second island, its pad far left; the current west, stronger, carries the jump to the green.
  island(10, -12, 20, -22, [10.5, 13.5]);
  cp(10, -12, 20, -13, [15, 0, -16]);
  gust(-4, -22.2, 20, -27.8, -12);
  // The green, to the left. A windbreak taller than any flight shelters the cup in its upwind corner:
  // a ball flying in is pushed west, so it never gets behind it; the cup is putted in from the west.
  island(0, -28, 10, -39);
  cp(0, -28, 10, -29, [4, 0, -31]);
  t.rail(3, [6, 0, -34], [10, 0, -34]);
  return t.tee(0, 0, 0).cup(8, 0, -37.5);
};
