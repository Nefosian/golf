import { hole, roundRect } from '../lib.mjs';

// Le Tremplin (show, par 3): the runway ends on a kicker at the edge of a ravine; past it, 2 lower, a
// wide green. Fast enough, the ball flies over and lands on it; too slow, it rolls back down the kicker
// (or falls short: +1). Safe: the road down round the west side. Everybody watches the others fly.
export default () => {
  const t = hole('Le Tremplin', { theme: 'canyon', par: 3 });
  t.plate(roundRect(-5, -4, 5, 4, 1.5), 3, { open: [[0, -4, 5], [-5, 0, 4.5]] });
  t.path([0, 3, -4], [0, -1], { width: 5 }).straight(4).straight(3, { rise: 0.6, ease: false }).done({ open: 'end' }); // the kicker: its lip is over the ravine
  t.path([-5, 3, 0], [-1, 0], { width: 4.5 }).straight(3.5).turn(-90, 3).straight(20, { rise: -2 }).turn(-90, 3).straight(1.5).done();
  return t.green(roundRect(-7, -30, 7, -16, 2), 1, 0, -25, { open: [[-7, -26, 4.5]] }).tee(0, 3, 2);
};
