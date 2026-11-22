import { hole } from '../lib.mjs';

// La Cascade: terraces down a staircase, each 1 lower, the cup on the last. Two free steps; then a
// muret open on the left, over a sand terrace that stops what comes through; a second muret open
// on the right; a last free drop onto the green, backed with sand. The murets are taller than the
// concept's: a ball bouncing off a step edge flies over anything low, from the tee as well.
export default () => {
  const t = hole('La Cascade', { theme: 'canyon', par: 4 });
  const X = 4, W = 2.4, M = 1.2; // half-width, side wall height (balls fly off the steps), muret height
  const z4 = -6, z3 = -12, z2 = -17, z1 = -21, zEnd = -28, zCup = -24.5; // far edges of the terraces
  // terraces: [z near, z far, floor height, material]; each is a solid block, so nothing rolls
  // under a ledge.
  const T = [[3, -2, 5], [-2, z4, 4], [z4, z3, 3], [z3, z2, 2, 'sand'], [z2, z1, 1], [z1, zEnd + 1.5, 0], [zEnd + 1.5, zEnd, 0, 'sand']];
  for (const [z0, z1, y, material] of T) {
    t.block(-X, z1, X, z0, -1, y, { kind: 0, ...(material ? { material } : {}) });
    t.rail(W, [-X, y, z0], [-X, y, z1]).rail(W, [X, y, z0], [X, y, z1]);
  }
  t.rail(W, [-X, 5, 3], [X, 5, 3]).rail(W, [-X, 0, zEnd], [X, 0, zEnd]); // back of the tee, end wall
  t.rail(M, [-1, 3, z3 + 0.15], [X, 3, z3 + 0.15]); // first muret: 3 open on the left
  t.rail(M, [-X, 2, z2 + 0.15], [1, 2, z2 + 0.15]); // second muret: 3 open on the right
  return t.tee(0, 5, 0).cup(0, 0, zCup);
};
