import { hole, roundRect } from '../lib.mjs';

// La Corniche (hard, par 3): two ledges along a rock face, over the void, a checkpoint half way on each.
// Safe: the west ledge, 3.5 wide, walled on its outer side for its first half. Risky: the east ledge,
// 2.5 wide, no wall at all. The one "all or nothing" hole of a game.
export default () => {
  const t = hole('La Corniche', { theme: 'canyon', par: 3 });
  t.plate(roundRect(-9, -3, 9, 3, 1.5), 0, { open: [[-4.75, -3, 3.5], [4.25, -3, 2.5]] });
  t.block(-3, -18, 3, -6, -0.15, 3); // the rock
  t.path([-4.75, 0, -3], [0, -1], { width: 3.5, walls: 'left' }).straight(9).straight(9, { walls: 'none' }).done();
  t.path([4.25, 0, -3], [0, -1], { width: 2.5, walls: 'none' }).straight(18).done();
  t.pad('checkpoint', -6.5, -12.5, -3, -11.5, 0, { at: [-4.75, 0.5, -12] });
  t.pad('checkpoint', 3, -12.5, 5.5, -11.5, 0, { at: [4.25, 0.5, -12] });
  return t.green(roundRect(-9, -30, 9, -21, 2), 0, 0, -26, { open: [[-4.75, -21, 3.5], [4.25, -21, 2.5]] }).tee(0, 0, 1);
};
