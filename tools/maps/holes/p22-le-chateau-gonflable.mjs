import { hole, roundRect } from '../lib.mjs';

// Le Château Gonflable (medium, par 3): from the tee, 2 up, a ledge over a bouncy castle: a floor of
// jelly that throws back a ball falling on it (it rolls slowly on it). Two low hurdles cross the jelly,
// each with a gap at the other end: a ball that jumps off the ledge bounces over them, one that rolls
// has to slalom through the gaps. Safe: the ramp down the east side, straight to the green. The coin
// waits between the hurdles. Balls bounce into each other.
export default () => {
  const t = hole('Le Château Gonflable', { theme: 'fete', par: 3 });
  t.plate(roundRect(-7, -3, 8, 3, 1), 2, { open: [[-2, -3, 5], [5.5, -3, 3]] });
  t.path([-2, 2, -3], [0, -1], { width: 5 }).straight(3).done({ open: 'end' }); // the ledge
  t.path([5.5, 2, -3], [0, -1], { width: 3 }).straight(10, { rise: -2 }).straight(3.5).done(); // the ramp
  t.plate(roundRect(-7, -16, 3, -6, 1.5), 0, { material: 'jelly', open: [[-2, -16, 8]] });
  t.rail(0.45, [-7, 0, -9.5], [-1, 0, -9.5]).rail(0.45, [-3, 0, -12.5], [3, 0, -12.5]); // the hurdles
  t.disc('strokes', -5.5, -11, 0.45, 0, { add: -1 }, { once: true });
  return t.green(roundRect(-7, -26, 8, -16, 1.5), 0, -2, -22, { open: [[-2, -16, 8], [5.5, -16, 3]] }).tee(0, 2, 1);
};
