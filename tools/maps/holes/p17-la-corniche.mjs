import { hole, roundRect } from '../lib.mjs';

// La Corniche (hard, par 4): two ledges along a rock face, over the void, a checkpoint half way on
// each. Safe: the west ledge, 3.5 wide, walled on its outer side for its first half; a row of moles
// further on, where its wall stops. Risky: the east ledge, 2.5 wide, no wall at all, where a block
// slides out of the rock face and back, pushing into the void. The one "all or nothing" hole.
export default () => {
  const t = hole('La Corniche', { theme: 'canyon', par: 4, maxStrokes: 10 });
  t.plate(roundRect(-9, -3, 9, 3, 1.5), 0, { open: [[-4.75, -3, 3.5], [4.25, -3, 2.5]] });
  t.block(-3, -18, 3, -6, -0.15, 3); // the rock
  t.path([-4.75, 0, -3], [0, -1], { width: 3.5, walls: 'left' }).straight(9).straight(9, { walls: 'none' }).done();
  t.path([4.25, 0, -3], [0, -1], { width: 2.5, walls: 'none' }).straight(18).done();
  t.pad('checkpoint', -6.5, -12.5, -3, -11.5, 0, { at: [-4.75, 0.5, -12] });
  t.pad('checkpoint', 3, -12.5, 5.5, -11.5, 0, { at: [4.25, 0.5, -12] });
  for (let i = 0; i < 3; i++) t.mole(-6 + i * 1.25, -16, 0, { r: 0.45, period: 2.8, phase: i / 3 });
  t.slider(3.05, -8.5, 3.85, -7.5, 0, 0.5, [1.6, 0], { period: 2.6 }); // out of the rock and back
  return t.green(roundRect(-9, -30, 9, -21, 2), 0, 0, -26, { open: [[-4.75, -21, 3.5], [4.25, -21, 2.5]] }).tee(0, 0, 1);
};
