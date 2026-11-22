import { hole } from '../lib.mjs';

// La Cible: a target lying flat, 18 x 18. A ring of ice (sand in its corners, four posts that
// deflect the glides), a ring of grass, the only one where a ball stops to aim, a ring of sand that
// eats 8 u/s in 2 u, and the bull, a 3 x 3 grass square with the cup. The coin lies on the far side
// of the ice ring: one has to go round to fetch it.
export default () => {
  const t = hole('La Cible', { theme: 'banquise', par: 3 });
  const cz = -14; // the center of the target
  // the rings, from the outside in: [half-size, material]; each is drawn as four strips, the
  // corners of the ice ring in sand.
  const rings = [[9, 'ice'], [6, undefined], [3.5, 'sand'], [1.5]];
  for (let i = 0; i + 1 < rings.length; i++) {
    const [a, m] = rings[i], b = rings[i + 1][0];
    const corner = i === 0 ? 'sand' : m;
    t.floor(-b, cz - a, b, cz - b, 0, m).floor(-b, cz + b, b, cz + a, 0, m); // north and south strips
    t.floor(-a, cz - b, -b, cz + b, 0, m).floor(b, cz - b, a, cz + b, 0, m); // west and east strips
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      t.floor(sx * a, cz + sz * a, sx * b, cz + sz * b, 0, corner);
  }
  t.floor(-1.5, cz - 1.5, 1.5, cz + 1.5); // the bull, the floor of the cup
  // the lawn of the tee, south of the target, open on the ice
  t.floor(-9, cz + 9, 9, cz + 14);
  t.fence(-9, cz - 9, 9, cz + 14);
  // four posts on the ice ring, off the middles of its strips; the south one stands on the straight line from the tee to the cup
  for (const [x, z] of [[-7.5, 3], [7.5, -3], [3, -7.5], [-3.75, 7.5]]) t.post(x, cz + z, 0, 0.35);
  t.disc('strokes', 0, cz - 7.5, 0.5, 0, { add: -1 }, { once: true }); // the coin, across the ice ring
  return t.tee(-6, 0, cz + 12).cup(0, 0, cz);
};
