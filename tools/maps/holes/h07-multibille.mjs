import { hole } from '../lib.mjs';

// Multibille: a pinball of two tilted tables. Bumpers kick; a chevron of plain walls caps the
// uphill side of each, so a ball rolling back down never falls on a bumper again (it would be kicked
// back up for ever). Whatever misses rolls back down: to the landing, or to the gutter at the foot.
export default () => {
  const S = Math.tan(9 * Math.PI / 180); // the tables rise 9°: nothing rests on them
  const z1 = -2 - 7, z2 = z1 - 5, z3 = z2 - 5, z4 = z3 - 5; // lower table, landing, upper table, shelf
  const Y1 = +(7 * S).toFixed(4), Y2 = +(12 * S).toFixed(4); // heights of the landing and of the shelf
  const low = z => (-2 - z) * S, high = z => Y1 + (z2 - z) * S; // floor height on each table
  const t = hole('Multibille', { theme: 'nuit', par: 4 });
  t.floor(-6, -2, 6, 2, 0); // the gutter, where the tee is
  t.slab([0, 0, -2], [0, Y1, z1], 12); // lower table
  t.floor(-6, z2, 6, z1, Y1); // the landing
  t.slab([0, Y1, z2], [0, Y2, z3], 8); // upper table, narrower
  // the shelf: the cup in an alcove open to the back, where a sand strip (no wall to bank on)
  // stops whatever comes up too fast: the cup is a putt from the shelf, never a shot from below.
  t.floor(-4, z3 - 3.5, 4, z3, Y2).floor(-4, z4, 4, z3 - 3.5, Y2, 'sand');
  t.rail(0.45, [-1.4, Y2, z3 - 2.6], [-1.4, Y2, z3 - 0.8], [1.4, Y2, z3 - 0.8], [1.4, Y2, z3 - 2.6]);
  t.rail(0.45, [-6, 0, 2], [6, 0, 2], [6, 0, -2], [6, Y1, z1], [6, Y1, z2], [4, Y1, z2], [4, Y2, z3], [4, Y2, z4],
    [-4, Y2, z4], [-4, Y2, z3], [-4, Y1, z2], [-6, Y1, z2], [-6, Y1, z1], [-6, 0, -2], [-6, 0, 2]);
  // a bumper post, and its chevron of plain walls on the uphill side
  const bumper = (x, z, y) => {
    const r = 0.45, d = r * S + 0.02;
    t.post(x, z, y(z) - d, r, 0.45 + 2 * d, 'bumper');
    t.rail(0.45, [x - 0.55, y(z), z], [x, y(z - 1.1), z - 1.1], [x + 0.55, y(z), z]); // steep: a ball slides off it
  };
  bumper(0, -4.5, low); bumper(-3, -7, low); bumper(3, -7, low);
  bumper(-2.2, z3 + 1.4, high); bumper(2.2, z3 + 1.4, high);
  t.disc('strokes', 0, -3.85, 0.35, low(-3.85), { add: -1 }, { once: true }); // the coin, just below the middle bumper: who takes it is kicked back down
  return t.tee(0, 0, 0.5).cup(0, Y2, z3 - 1.7);
};
