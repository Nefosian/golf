import { hole } from '../lib.mjs';

// Le Goulot: two funnels of walls end in slits barely wider than a ball (0.36): 1 u, then 0.6 u,
// offset from each other. The balls that miss pile up in the funnel, in front of the slit.
export default () => {
  const t = hole('Le Goulot', { theme: 'chateau', par: 3 });
  const W = 5, H = 0.45, T = 0.15; // half width, wall height, half wall thickness
  // a straight wall across the hole at z, from x0 to x1 (exact ends: the slits are their gaps)
  const cross = (z, x0, x1) => t.block(x0, z - T, x1, z + T, -0.15, H);
  t.floor(-W, -24, W, 2.5);
  t.fence(-W, -24, W, 2.5);
  // act 1: the first funnel, 5 long, ends in a 1 u slit left of the axis
  const s1 = [-2, -1]; // slit 1, x from to
  cross(-7, -W, s1[0]);
  cross(-7, s1[1], W);
  t.rail(H, [-W, 0, -2], [s1[0] - 0.3, 0, -6.6]).rail(H, [W, 0, -2], [s1[1] + 0.3, 0, -6.6]);
  // act 2: the antechamber (5 deep), then the second funnel, ending in a 0.6 u slit right of the axis
  const s2 = [1.7, 2.3];
  cross(-17, -W, s2[0]);
  cross(-17, s2[1], W);
  t.rail(H, [-W, 0, -12], [s2[0] - 0.3, 0, -16.6]).rail(H, [W, 0, -12], [s2[1] + 0.3, 0, -16.6]);
  // act 3: the green, 10 x 7; the cup 3.5 behind the slit, a step off its line
  return t.tee(0, 0, 0.5).cup(1, 0, -20.5);
};
