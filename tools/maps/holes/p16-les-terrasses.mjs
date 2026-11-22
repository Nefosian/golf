import { hole, roundRect } from '../lib.mjs';

// Les Terrasses (hard, par 3): a hill in steps, each terrace open at the front over the next, 1 lower;
// a ramp round the east side. Safe: the ramp. Risky: down from terrace to terrace, stopping on each (too
// hard, the ball lands a terrace further: never in the void). Balls land among each other on the
// small terraces.
export default () => {
  const t = hole('Les Terrasses', { theme: 'canyon', par: 3 });
  t.plate(roundRect(-6, -4, 6, 4, 1), 3, { open: [[0, -4, 10], [6, 0, 4.5]] });
  t.plate(roundRect(-6, -8, 6, -4, 1), 2, { open: [[0, -8, 10]] });
  t.plate(roundRect(-6, -12, 6, -8, 1), 1, { open: [[0, -12, 10]] });
  t.path([6, 3, 0], [1, 0], { width: 4.5 }).straight(1.5).turn(-90, 3).straight(11, { rise: -3 }).turn(90, 3).straight(1.5).done();
  return t.green(roundRect(-6, -23, 6, -12, 2), 0, 0, -18.5, { open: [[6, -17, 4.5]] }).tee(0, 3, 2);
};
