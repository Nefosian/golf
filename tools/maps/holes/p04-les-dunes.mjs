import { hole, roundRect, disc } from '../lib.mjs';

// Les Dunes (easy, par 3): a wide fairway that rolls over a dune, two bunkers on the direct line and one
// guarding the green. Safe: round them on the right, longer. Risky: thread the 2-wide gap between them.
// Out of sand in one shot, always (6 u at most at full power). The gap is where balls meet.
export default () => {
  const t = hole('Les Dunes', { theme: 'quai', par: 3 });
  // the bunkers first: laid on the fairway, at its height, they win where they overlap it
  t.plate(disc(-3.4, -14, 2.6), 0, { walls: false, material: 'sand' });
  t.plate(disc(2.6, -15, 1.8), 0, { walls: false, material: 'sand' });
  t.plate(disc(0, -22.3, 2.2), 0, { walls: false, material: 'sand' });
  t.green(roundRect(-8, -31, 8, 3, 3), 0, 0, -27);
  t.path([0, 0, -4], [0, -1], { width: 16, walls: 'none' }).straight(3, { rise: 0.5 }).straight(3, { rise: -0.5 }).done(); // the dune
  return t.tee(0, 0, 0.5);
};
