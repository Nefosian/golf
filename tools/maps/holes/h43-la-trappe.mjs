import { hole } from '../lib.mjs';

// La Trappe: the cup is in the cellar, two floors down. In each floor, a trapdoor the colour of a
// key: without the key it is floor, one rolls over it; with the key one falls through. The floors
// are staggered so that each one shows from above.
export default () => {
  const t = hole('La Trappe', { theme: 'chateau', par: 5, maxStrokes: 12 });
  const H = 0.45;
  // floor at y over [x0, z0]-[x1, z1] with a trapdoor [tx0, tz0]-[tx1, tz1] cut in it, the gate of key
  const trapFloor = (y, [x0, z0, x1, z1], [tx0, tz0, tx1, tz1], key) => {
    for (const [a, b, c, d] of [[x0, z0, x1, tz0], [x0, tz1, x1, z1], [x0, tz0, tx0, tz1], [tx1, tz0, x1, tz1]])
      if (a !== c && b !== d) t.floor(a, b, c, d, y);
    t.block(tx0, tz0, tx1, tz1, y - 0.5, y, { kind: 0, key });
  };
  // act 1: the terrace, 8 x 18, 4 high; the blue key in the far corner, its trapdoor halfway,
  // against the east rail (the floor below shows through it)
  trapFloor(4, [-4, 2, 4, -16], [1.25, -5.75, 3.75, -8.25], 1);
  t.fence(-4, 2, 4, -16, 4);
  t.disc('key', -2.8, -14.8, 0.5, 4, { key: 1 });
  // act 2: the mezzanine, 2 high: a 3 x 3 landing bay under the trapdoor (its walls stop a ball
  // falling through), open on its north side to a hall 12 x 6 that runs out to the east; the
  // vermilion key at the hall's far end behind a post, its trapdoor in the far corner
  t.floor(1, -5.5, 4, -8.5, 2);
  trapFloor(2, [1, -8.5, 13, -14.5], [10.5, -12, 13, -14.5], 2);
  t.rail(H, [1, 2, -8.5], [1, 2, -5.5], [4, 2, -5.5], [4, 2, -8.5], [13, 2, -8.5], [13, 2, -14.5], [1, 2, -14.5], [1, 2, -8.5]);
  t.post(10.6, -9.9, 2, 0.4);
  t.disc('key', 12, -9.5, 0.5, 2, { key: 2 });
  // act 3: the cellar, 8 x 8, under the second trapdoor and out to the east; the cup 3.5 from
  // under it, in the open
  t.floor(9, -10.5, 17, -18.5, 0);
  t.fence(9, -10.5, 17, -18.5, 0);
  return t.tee(0, 4, 0.5).cup(14, 0, -16);
};
