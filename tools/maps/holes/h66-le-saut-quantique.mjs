import { hole, V } from '../lib.mjs';

// Le Saut Quantique: a jumppad throws the ball up into a portal hanging over the void; it comes out
// above another island with its speed kept and finishes its jump there. The run-up, which the pad
// does not touch, decides where. The second pad, on the next island, aims at a small portal that
// only a dosed run-up (about 7 to 10 u/s) reaches; it comes out above the long green, turned to fly along it. The
// safe way round the second void is a narrow footbridge, in two legs.
export default () => {
  const t = hole('Le Saut Quantique', { theme: 'nuit', par: 4, maxStrokes: 10 });
  const W = 0.45, L = 0.6; // rail height, pad depth
  // a tall checkpoint band: a ball dropping out of a portal goes through it too
  const cp = (x0, z0, x1, z1, at) =>
    t.zone('checkpoint', { shape: 0, c: V((x0 + x1) / 2, 1.5, (z0 + z1) / 2), h: V(Math.abs(x1 - x0) / 2, 1.5, Math.abs(z1 - z0) / 2), params: { at } });
  // a portal in the air, over the void
  const portal = (x, y, z, r, hh, to, turn) => t.zone('teleport', { shape: 1, c: V(x, y, z), r, hh, params: { to, ...(turn ? { turn } : {}) } });

  // act 1: the tee island, 8 x 6, the pad in a bay of its north edge between two fins
  t.floor(-4, -3, 4, 3).floor(-1.5, -3 - L, 1.5, -3);
  t.rail(W, [-1.5, 0, -3 - L], [-1.5, 0, -3], [-4, 0, -3], [-4, 0, 3], [4, 0, 3], [4, 0, -3], [1.5, 0, -3], [1.5, 0, -3 - L]);
  t.pad('jumppad', -1.5, -3, 1.5, -3 - L, 0, { speed: 8 });
  // the big portal, 3 past the pad, 1.5 up: nearly any run-up flies into it
  const I2 = [5, -10, 13, -16]; // the second island
  portal(0, 1.5, -6.6, 1.2, 0.6, [7.5, 1.2, -10.6]);
  // act 2: the second island, east of the first, a tall wall at its back where the first jump comes
  // down; its pad along the east half of the north edge, open: it is taken on a slant, from the west
  const [ax0, az0, ax1, az1] = I2, b0 = 9.5, b1 = ax1;
  t.floor(ax0, az1, ax1, az0).floor(b0, az1 - L, b1, az1);
  t.rail(1.5, [ax0, 0, az1], [b0, 0, az1], [b0, 0, az1 - L]);
  t.rail(W, [ax1, 0, az1 - L], [ax1, 0, az0], [ax0, 0, az0], [ax0, 0, -11.9]).rail(W, [ax0, 0, -13.7], [ax0, 0, az1]);
  t.pad('jumppad', b0, az1, b1, az1 - L, 0, { speed: 8 });
  cp(ax0, az0, ax1, az0 - 0.8, [9, 0, -10.4]);
  // the small portal, 5 past the pad on the diagonal from the middle of the island: only a dosed
  // run-up gets in; out above the east end of the green, turned (3/8 of a turn) to fly on west
  const Q = Math.SQRT1_2 * 5;
  portal(11 + Q, 1.5, az1 - Q, 0.6, 0.4, [3.6, 1.2, -26], 3 * Math.PI / 4);
  // the footbridge, 1.6 wide, no rail: west off the island, a corner landing, north to the green
  t.floor(2.5, -13.7, ax0, -11.9);
  t.floor(0, -14.5, 2.5, -11.1).rail(W, [0, 0, -14.5], [0, 0, -11.1], [2.5, 0, -11.1], [2.5, 0, -11.9]);
  t.floor(0.45, -24, 2.05, -14.5);
  // act 3: the green, 12 x 4, along x; tall rails at its ends
  const G = [-5, -24, 7, -28];
  t.floor(G[0], G[3], G[2], G[1]);
  t.rail(W, [0.45, 0, -24], [G[0], 0, -24]).rail(1.2, [G[0], 0, -24], [G[0], 0, -28], [G[2], 0, -28]).rail(2.5, [G[2], 0, -28], [G[2], 0, -24]).rail(2.5, [G[2], 0, -24], [2.05, 0, -24]); // taller than any jump: the green is reached only through the portal or the bridge
  cp(G[0] + 0.8, -24, G[0] + 1.6, -28, [-3.8, 0, -26]);
  // the cup behind the exit: a ball dropped from the small portal flies away from it, and putts back
  return t.tee(0, 0, 1.5).cup(5.6, 0, -26.6);
};
