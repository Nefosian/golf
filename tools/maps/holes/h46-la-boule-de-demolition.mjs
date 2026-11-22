import { hole, V } from '../lib.mjs';

// La Boule de Démolition: a long bridge over water, swept by wrecking balls hanging 4 above it.
// A slow one bumps balls against the rails; two out of phase on the narrow, rail-less bridge throw
// them in the water; the last swings along the bridge, towards the players.
export default () => {
  const t = hole('La Boule de Démolition', { theme: 'quai', par: 4, maxStrokes: 10 });
  const H = 0.45, L = 4, B = 0.6; // wall height, rope length, half size of a wrecking ball (a box)
  // ball at (x, z) swinging across the bridge (axis z) or along it (axis x), its bottom 0.05 above y
  const wrecker = (x, z, y, axis, period, swing, phase = 0, wide = B) => {
    const cy = y + 0.05 + B, py = cy + L;
    const motion = { period, phase, move: [0, 0, 0], pivot: V(x, py, z), axis, swing };
    t.raw({ shape: 0, kind: 1, c: V(x, cy, z), h: [wide, B, B], motion });
    t.raw({ shape: 0, kind: 1, c: V(x, (cy + B + py) / 2, z), h: V(0.05, (py - cy - B) / 2, 0.05), motion }); // the rope
  };
  // a hump under a wrecking ball of the narrow bridge: no ball can rest where the ball sweeps
  const hump = (x, z, top) => {
    t.slab([x, 0, z + 1.2], [x, top, z], 3).slab([x, top, z], [x, 0, z - 1.2], 3);
  };

  // the quay
  t.floor(-3, 2, 3, -2);
  t.rail(H, [-3, 0, -2], [-3, 0, 2], [3, 0, 2], [3, 0, -2]);
  // act 1: the wide stretch with rails, a slow ball (4.5 s) that only bumps
  t.floor(-3, -2, 3, -10);
  t.rail(H, [-3, 0, -2], [-3, 0, -10], [-1.5, 0, -10]).rail(H, [3, 0, -2], [3, 0, -10], [1.5, 0, -10]);
  wrecker(0, -6, 0, [0, 0, 1], 4.5, 0.75);
  // act 2: the narrow bridge (3 wide, no rail) zigzags: a wrecking ball on each leg, out of phase,
  // and a shelter (checkpoint) at each elbow
  const top = 0.25;
  t.floor(-1.5, -10, 1.5, -11.55);
  hump(0, -12.75, top);
  wrecker(0, -12.75, top, [0, 0, 1], 3.5, 0.6);
  t.floor(-1.5, -13.95, 1.5, -15.5);
  t.floor(-4.5, -15.5, 1.5, -17.5); // shelter 1
  t.pad('checkpoint', -4.5, -16, 1.5, -17, 0, { at: [-1.5, 0, -16.5] });
  t.floor(-4.5, -17.5, -1.5, -19.05);
  hump(-3, -20.25, top);
  wrecker(-3, -20.25, top, [0, 0, 1], 3.5, 0.6, 0.25);
  t.floor(-4.5, -21.45, -1.5, -23);
  t.floor(-4.5, -23, 1.5, -25); // shelter 2
  t.pad('checkpoint', -4.5, -23.5, 1.5, -24.5, 0, { at: [-1.5, 0, -24] });
  t.rail(H, [-1.5, 0, -23], [1.5, 0, -23]); // a back kerb: what the last ball knocks back stays dry
  t.water(-9, -10, -1.5, -15.5).water(-9, -15.5, -4.5, -25);
  t.water(1.5, -10, 9, -17.5).water(-1.5, -17.5, 9, -23).water(1.5, -23, 9, -25);
  // act 3: the last ball swings along the bridge (kerbs keep its victims on it)
  t.floor(-1.5, -25, 1.5, -33);
  t.rail(H, [-1.5, 0, -25], [-1.5, 0, -33]).rail(H, [1.5, 0, -25], [1.5, 0, -33]);
  wrecker(0, -29, 0, [1, 0, 0], 4, 0.6, 0, 1.2); // as wide as the bridge: no way round it
  // the green, out of the last ball's reach
  t.floor(-4, -33, 4, -39);
  t.rail(H, [-1.5, 0, -33], [-4, 0, -33], [-4, 0, -39], [4, 0, -39], [4, 0, -33], [1.5, 0, -33]);
  return t.tee(0, 0, 0).cup(-1, 0, -36.5);
};
