import { hole, roundRect } from '../lib.mjs';

// Le Col du Vent (medium, par 3): a bare crest, no walls, swept by a side wind (the fans show where it
// comes from); the green sheltered beyond. Safe: a walled road round the side, out of the wind. Risky:
// the crest, aiming into the wind (a ball that stops on it is blown off: +1). Blown balls end on the
// same side of the green.
export default () => {
  const t = hole('Le Col du Vent', { theme: 'chateau', par: 3 });
  t.plate(roundRect(-5, -4, 5, 4, 1.5), 0, { open: [[0, -4, 3], [-5, 0, 4.5]] });
  t.path([0, 0, -4], [0, -1], { width: 3, walls: 'none' }).straight(17).done(); // the crest
  t.zone('wind', { shape: 0, c: [0, 1.2, -12.5], h: [1.5, 1.2, 7.5], params: { accel: [3, 0, 0] } });
  t.path([-5, 0, 0], [-1, 0], { width: 4.5 }).straight(2).turn(-90, 3).straight(20).turn(-90, 3).straight(2).done();
  return t.green(roundRect(-5, -31, 5, -21, 2), 0, 0, -27, { open: [[0, -21, 3], [-5, -26, 4.5]] }).tee(0, 0, 1.5);
};
