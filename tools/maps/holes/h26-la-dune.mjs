import { hole } from '../lib.mjs';

// La Dune: two ways up to a summit 2.4 high. On the west, sand faces (22° then 31°): sand holds a
// ball even on a steep slope, so any shot there is safe, but it only climbs a few units. On the east,
// grass ramps (10°): a ball flies up them, and rolls back down when it stops short. The plage before
// the dune is sand, crossed by a grass boardwalk.
export default () => {
  const t = hole('La Dune', { theme: 'canyon', par: 4 });
  const H1 = 1.2, H2 = 2.4, W = 0.8; // the small dune, the summit, rail height
  t.floor(-6, -2, 6, 5);                                     // the lawn of the tee
  t.floor(-6, -7, -1, -2, 0, 'sand').floor(-1, -7, 1, -2).floor(1, -7, 2, -2, 0, 'sand'); // the plage, its boardwalk
  t.floor(2, -3, 6, -2);
  // the sand way: face, terrace, face
  t.slab([-2, 0, -7], [-2, H1, -10], 8, 'sand');
  t.floor(-6, -15, 2, -10, H1, 'sand');
  t.slab([-2, H1, -15], [-2, H2, -17], 8, 'sand');
  // the grass way: ramp, ledge, ramp, landing; a bank in the corner turns it west onto the summit
  t.slab([4, 0, -3], [4, H1, -10], 4);
  t.floor(2, -14, 6, -10, H1);
  t.slab([4, H1, -14], [4, H2, -21], 4);
  t.floor(2, -24.5, 6, -21, H2);
  // the summit, solid down to the ground: the cup is cut in it
  t.block(-6, -24.5, 2, -17, 0, H2, { kind: 0 });
  t.rail(W, [-6, 0, 5], [-6, 0, -7], [-6, H1, -10], [-6, H1, -15], [-6, H2, -17], [-6, H2, -24.5], [6, H2, -24.5],
    [6, H2, -21], [6, H1, -14], [6, H1, -10], [6, 0, -3], [6, 0, 5], [-6, 0, 5]);
  t.rail(W, [2, H1, -10], [2, H1, -14], [2, H1 + 3 / 7 * (H2 - H1), -17]); // the grass way's west side, over the sand
  t.rail(W, [2, H2, -17], [2, H2, -21]);   // the summit's edge over the second ramp
  t.rail(W, [6, H2, -22.5], [4, H2, -24.5]); // the bank at the top
  t.post(-3.6, -22.5, H2); // screens the cup from balls coming off the bank
  return t.tee(0, 0, 3.5).cup(-4.5, H2, -22.5);
};
