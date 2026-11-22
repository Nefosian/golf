import { hole } from '../lib.mjs';

// Le Toboggan: a marble run down 5 units. A gentle first lacet brings the ball to a flat landing;
// from there, left, a long run of lacets (never under 8°: nothing stops in them, turns included) drops
// it in a bunker in front of the green; right, a steep chute ends in a kicker that throws it over a
// sand ditch onto the green, a putt from the cup.
export default () => {
  const t = hole('Le Toboggan', { theme: 'banquise', par: 3 });
  const W = 0.8, P = 4.1; // rails (tall: balls are fast on the slopes), the landing's height
  const R = (...p) => t.rail(W, ...p);
  t.floor(-2, -1, 2, 2, P + 1).tee(0, P + 1, 0.5);                 // the tee
  t.slab([0, P + 1, -1], [0, P, -7], 4);                            // lacet 1, 9.5°
  t.floor(-4, -11, 4, -7, P);                                       // the landing
  R([-2, P + 1, -1], [-2, P + 1, 2], [2, P + 1, 2], [2, P + 1, -1]);
  R([-2, P + 1, -1], [-2, P, -7], [-4, P, -7]);
  R([2, P + 1, -1], [2, P, -7], [4, P, -7], [4, P, -11]);
  R([-4, P, -11], [0, P, -11]);                                     // the landing's back: the chute opens on its right half
  // left: lacets west, north and east, the turns cut at 45° and tilted (8.5°) like the rest
  t.slab([-4, P, -9], [-9, 3.3, -9], 4);                            // west, 9°
  t.slab([-11, 3.3, -7], [-11, 2.7, -11], 4);                       // turn, down to the north
  t.slab([-11, 2.7, -11], [-11, 1.4, -20], 4);                      // north, 8.2°
  t.slab([-13, 1.4, -22], [-9, 0.8, -22], 4);                       // turn, down to the east
  t.slab([-9, 0.8, -22], [-5, 0, -22], 4);                          // east, 11.3°
  R([-4, P, -7], [-9, 3.3, -7], [-13, 2.7, -11], [-13, 1.4, -20], [-9, 0.8, -24], [-5, 0, -24], [-3, 0, -24]);
  R([-4, P, -11], [-9, 3.3, -11]);
  R([-9, 2.7, -11], [-9, 1.4, -20]);
  R([-9, 0.8, -20], [-5, 0, -20], [-3, 0, -20], [-3, 0, -18], [5, 0, -18], [5, 0, -27]);
  t.rail(2.5, [5, 0, -27], [-3, 0, -27]).rail(W, [-3, 0, -27], [-3, 0, -24]); // a tall back wall catches the longest jumps
  t.floor(-5, -24, -3, -20, 0, 'sand');                             // the bunker where the lacets end
  // right: the chute, 21.8°, and its kicker
  t.slab([2, P, -11], [2, 1.3, -18], 4).slab([2, 1.3, -18], [2, 1.7, -19], 4);
  R([0, P, -11], [0, 1.3, -18], [0, 1.7, -19]);
  R([4, P, -11], [4, 1.3, -18], [4, 1.7, -19]);
  t.floor(-3, -20, 5, -18, 0, 'sand');                              // the ditch
  t.floor(-3, -25.8, 5, -20).floor(-3, -27, 5, -25.8, 0, 'sand');   // the green, sand at the back: the long jumps die there
  // the cup is left of the chute's lane: a jump never rolls straight into it, it leaves a putt
  return t.cup(-1.5, 0, -23.5);
};
