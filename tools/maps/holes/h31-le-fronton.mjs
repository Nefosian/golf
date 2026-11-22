import { hole } from '../lib.mjs';

// Le Fronton: pelota. Two bumper walls send any ball back at 9 u/s, so it always rolls 12 u:
// the big fronton (north) brings the tee shot back into the court, the small one (east) sends a
// well-aimed ball 12 u west into the pen of the cup, open on its east side only.
export default () => {
  const t = hole('Le Fronton', { theme: 'canyon', par: 3 });
  const x0 = -8, x1 = 8, zs = 1, zn = -20; // the court
  t.floor(x0, zn, x1, zs);
  t.rail(0.45, [x0, 0, zs], [x1, 0, zs], [x1, 0, -8]).rail(0.45, [x1, 0, -14], [x1, 0, zn], [4, 0, zn]).rail(0.45, [-6, 0, zn], [x0, 0, zn], [x0, 0, zs]);
  t.rail(0.45, [4, 0, zn], [-6, 0, zn], 'bumper'); // the big fronton, 10 u
  t.rail(0.45, [x1, 0, -8], [x1, 0, -14], 'bumper'); // the small fronton, 6 u, 12 u east of the pen
  const pz = -11, ph = 1.2; // the pen: its middle line, its half-width
  t.rail(0.45, [-3, 0, pz + ph], [-5.2, 0, pz + ph], [-5.2, 0, pz - ph], [-3, 0, pz - ph]);
  return t.tee(-4, 0, -1).cup(-4, 0, pz);
};
