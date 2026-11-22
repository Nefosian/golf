import { hole } from '../lib.mjs';

// La Planche à Clous: a Galton board in two stages. The first board (14°, nails far apart) drops the
// balls into one of three lanes of a shelf; a lip at its foot holds the slow ones there. From where
// the nails left it, the ball is let go again down the second board (nails close together), which
// ends in three exits: the green in the middle, long pockets on both sides, a coin in the right one.
// Whatever comes down the board is fast: a crown of nails shields the cup on that side, and sand
// at the back stops the balls; the cup is putted from behind.
export default () => {
  const t = hole('La Planche à Clous', { theme: 'quai', par: 3 });
  const X = 6, W = 2.5; // half-width, wall height (a fast ball flies off the lip)
  // profile along z: balcony edge, board 1 foot, lip foot, lip top, board 2 foot, sand, end
  const zB = -1, z1 = -9, zL = -11, zT = -12.5, z2 = -20, zS = -25, zEnd = -27.5;
  const yB = 4, yS = 2, yT = 2.6; // balcony, shelf, lip top
  t.floor(-X, zB, X, 2.5, yB); // the balcony
  t.slab([0, yB, zB], [0, yS, z1], 2 * X); // first board
  t.floor(-X, zL, X, z1, yS); // the shelf
  t.slab([0, yS, zL], [0, yT, zT], 2 * X); // its lip
  t.slab([0, yT, zT], [0, 0, z2], 2 * X); // second board
  t.floor(-X, zS, X, z2, 0).floor(-X, zEnd, X, zS, 0, 'sand'); // the lawn, sand at its back
  for (const s of [-X, X]) t.rail(W, [s, yB, 2.5], [s, yB, zB], [s, yS, z1], [s, yS, zL], [s, yT, zT], [s, 0, z2], [s, 0, zEnd]);
  t.rail(W, [-X, yB, 2.5], [X, yB, 2.5]).rail(W, [-X, 0, zEnd], [X, 0, zEnd]);
  // nails: posts standing on a board, at the board's height where they stand
  const nail = (x, z, za, ya, zb, yb) => t.post(x, z, ya + (yb - ya) * (z - za) / (zb - za), 0.25, 0.6);
  for (const [z, xs] of [[-2.5, [-4, 0, 4]], [-4.5, [-2, 2]], [-6.5, [-4, 0, 4]]]) for (const x of xs) nail(x, z, zB, yB, z1, yS);
  for (const [z, xs] of [[-13.6, [-4, -2, 0, 2, 4]], [-15.1, [-5, -3, -1, 1, 3, 5]], [-16.6, [-4, -2, 0, 2, 4]], [-18.1, [-3, -1, 1, 3]]]) for (const x of xs) nail(x, z, zT, yT, z2, 0);
  // the shelf's lanes: two dividers from the foot of the first board, stopping short of the lip
  for (const x of [-2, 2]) t.rail(0.6, [x, yS + 0.25, z1 + 1], [x, yS, z1], [x, yS, -10]);
  // the exits: three lanes down to the sand
  for (const x of [-2, 2]) t.rail(0.6, [x, 0.5, -18.75], [x, 0, z2], [x, 0, -24.5]);
  const cz = -23.3;
  for (let a = 0; a <= 180; a += 30) t.post(0.95 * Math.cos(a * Math.PI / 180), cz + 0.95 * Math.sin(a * Math.PI / 180), 0, 0.2, 0.6); // the crown
  t.disc('strokes', 4, -21.5, 0.5, 0, { add: -1 }, { once: true });
  return t.tee(0, yB, 1).cup(0, 0, cz);
};
