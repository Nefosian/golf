import { hole, roundRect, disc } from '../lib.mjs';

// Les Dunes (medium, par 3): a beach cut in two by a river. Act 1: over the dune to the bank. Act 2:
// the river, 3 wide: a geyser on the bank throws a ball that comes at it fast enough over it (too
// slow: in the water); or the plank on the right, 1.6 wide, no rails. Act 3: the green, bunkers on the
// direct line and one guarding the cup. Out of sand in one shot, always. Balls meet at the geyser.
export default () => {
  const t = hole('Les Dunes', { theme: 'quai', par: 3 });
  t.plate(roundRect(-8, -12, 8, 3, 1), 0, { open: [[0, -12, 14]] });
  t.path([0, 0, -2], [0, -1], { width: 16, walls: 'none' }).straight(3, { rise: 0.5 }).straight(3, { rise: -0.5 }).done({ open: 'both' }); // the dune
  t.geyser(0, -11.3, 0, { r: 0.6, speed: 6 });
  t.lake(-8, -15, 8, -12, [[5.7, -15, 7.3, -12]]);
  t.floor(5.7, -15.05, 7.3, -11.95); // the plank
  t.plate(disc(-3.4, -21, 2.4), 0, { walls: false, material: 'sand' });
  t.plate(disc(2.8, -22, 1.8), 0, { walls: false, material: 'sand' });
  t.plate(disc(0, -26.5, 1.6), 0, { walls: false, material: 'sand' });
  return t.green(roundRect(-8, -33, 8, -15, 1), 0, 0, -29.5, { open: [[0, -15, 14]] }).tee(0, 0, 1.5);
};
