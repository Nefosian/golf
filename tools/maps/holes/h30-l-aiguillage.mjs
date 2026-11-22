import { hole } from '../lib.mjs';

// L'Aiguillage: a wide conveyor carries every ball north and splits twice. The first switch sends
// its west part onto a return belt that brings the ball back to the tee lawn; the second splits
// the rest into a narrow middle lane (the green) and a wide east lane (a sand bin and its coin).
export default () => {
  const t = hole("L'Aiguillage", { theme: 'ville', par: 3 });
  const A = 4; // the push of the belts (u/s²)
  t.floor(-7, -1, 4, 3); // the tee lawn
  t.floor(-7, -9, 4, -1).floor(-0.5, -15, 4, -9); // under the belts
  t.floor(-7, -21, 1, -15); // the green
  t.floor(1, -21, 4, -15, 0, 'sand'); // the sand bin
  t.rail(0.45, [-7, 0, -9], [-7, 0, 3], [4, 0, 3], [4, 0, -21], [-7, 0, -21], [-7, 0, -15], [-0.5, 0, -15], [-0.5, 0, -9], [-7, 0, -9]);
  t.rail(0.45, [-3, 0, -1], [-3, 0, -6]); // between the main belt and the return belt
  const sw = (x, z) => t.rail(0.45, [x - 0.6, 0, z - 1.2], [x, 0, z], [x + 0.6, 0, z - 1.2]); // a switch: its point faces south
  sw(-0.5, -6).rail(0.45, [-0.5, 0, -6], [-0.5, 0, -9]); // the first: its west part turns west
  sw(1, -11).rail(0.45, [1, 0, -11], [1, 0, -15]); // the second: the narrow middle lane, the wide east lane
  t.rail(0.45, [1, 0, -16.5], [1, 0, -21]); // the sand bin opens on the green at its south end only
  const belt = (x0, z0, x1, z1, accel) => t.pad('wind', x0, z0, x1, z1, 0, { accel });
  belt(-3, -1, 4, -6, [0, 0, -A]); // the main belt, 7 wide
  belt(-3, -6, -0.5, -9, [-A, 0, 0]); // past the first switch, west
  belt(-7, -9, -3, -1, [0, 0, A]); // the return belt, ending on the tee lawn
  belt(-0.5, -6, 4, -11, [0, 0, -A]);
  belt(-0.5, -11, 1, -15, [0, 0, -A]); // the middle lane
  belt(1, -11, 4, -15, [0, 0, -A]); // the east lane
  t.disc('strokes', 3.3, -20.3, 0.5, 0, { add: -1 }, { once: true }); // the coin, at the back of the sand: a stroke to fetch it
  return t.tee(0.5, 0, 1.5).cup(-4, 0, -18.5);
};
