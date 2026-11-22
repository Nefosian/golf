import { hole, roundRect } from '../lib.mjs';

// Les Moulins (hard, par 3): a road with two turning bars across it, a short regular turn each (you can
// see when to go). Safe: the free strip along a wall, 1 wide, at the end of each bar. Risky: through the
// middle between two passes. Nothing moves near the tee or the cup. Balls wait for the same opening:
// they go in a salvo.
export default () => {
  const t = hole('Les Moulins', { theme: 'bocage', par: 3 });
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 0, { open: [[0, -3, 6]] });
  t.path([0, 0, -3], [0, -1], { width: 6 }).straight(22).done();
  const bar = (z, period, phase, turn) => t.raw({ shape: 0, kind: 1, c: [0, 0.25, z], rot: [0, 0, 0], h: [2, 0.25, 0.15],
    motion: { period, phase, move: [0, 0, 0], pivot: [0, 0.25, z], axis: [0, turn, 0] } });
  bar(-9, 4, 0, 1);
  bar(-18, 4, 0.25, -1);
  return t.green(roundRect(-6, -33, 6, -25, 2), 0, 0, -29.5, { open: [[0, -25, 6]] }).tee(0, 0, 1);
};
