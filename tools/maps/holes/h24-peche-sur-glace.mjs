import { hole } from '../lib.mjs';

// Pêche sur Glace: a frozen lake to cross. The lake rises gently (2°) towards the far shore: a ball
// that dies on the ice slides back, so it stops only on the grass islets, in the sand snowbanks along
// the sides, or on the far shore. Fishing holes (water) dot the far half. The shore, with the cup, lies
// behind a low bank wall open only in its middle, and the last fishing hole sits right in front of
// that opening: no shot from the tee gets through, a ball comes in slanting, from a snowbank or an
// islet near the bank.
export default () => {
  const t = hole('Pêche sur Glace', { theme: 'banquise', par: 4, maxStrokes: 10 });
  const X = 7, S = 0.6, N = -24, k = 0.035; // half-width, snowbank width, bank wall, rise (2°)
  const y = z => -z * k, top = y(N);
  const sheet = (x0, z0, x1, z1, mat) => t.slab([(x0 + x1) / 2, y(z0), z0], [(x0 + x1) / 2, y(z1), z1], x1 - x0, mat); // a piece of the lake, z0 > z1
  // ice: the lake minus the islets, tiled in bands of z so that no two floors overlap
  const tile = (x0, z0, x1, z1, cuts, mat) => {
    const zs = [...new Set([z0, z1, ...cuts.flatMap(c => [c[1], c[3]])])].sort((a, b) => b - a);
    for (let i = 0; i + 1 < zs.length; i++) {
      const [za, zb] = [zs[i], zs[i + 1]];
      const xs = cuts.filter(c => c[1] >= za && c[3] <= zb).map(c => [c[0], c[2]]).sort((a, b) => a[0] - b[0]);
      let x = x0;
      for (const [ca, cb] of xs) { if (ca > x) sheet(x, za, ca, zb, mat); x = cb; }
      if (x < x1) sheet(x, za, x1, zb, mat);
    }
  };
  const islets = [[-2.5, -6], [2.5, -6], [0, -14.5], [-3.5, -21], [3.5, -21]].map(([x, z]) => [x - 1, z + 1, x + 1, z - 1]);
  tile(-X + S, 0, X - S, N, islets, 'ice');
  for (const c of islets) sheet(c[0], c[1], c[2], c[3]);              // the islets, grass
  sheet(-X, 0, -X + S, N, 'sand'); sheet(X - S, 0, X, N, 'sand');     // the snowbanks
  t.floor(-X, 0, X, 3);                                              // the tee
  t.floor(-X, -27, X, N, top);                                       // the far shore
  t.rail(0.45, [-X, top, -27], [-X, top, N], [-X, 0, 0], [-X, 0, 3], [X, 0, 3], [X, 0, 0], [X, top, N], [X, top, -27], [-X, top, -27]);
  t.rail(0.45, [-X, top, N], [-0.9, top, N]).rail(0.45, [0.9, top, N], [X, top, N]); // the bank wall, its opening
  // fishing holes: one in the middle (the coin right behind it), two on the bank shots off the side
  // boards, one more, and the last one in front of the opening
  for (const [x, z, r] of [[0, -11, 0.8], [3.9, -17, 0.8], [-3.9, -17, 0.8], [0, -18.5, 0.8], [0, -22.9, 0.75]]) t.disc('hazard', x, z, r, y(z));
  t.disc('strokes', 0, -12.05, 0.35, y(-12.05), { add: -1 }, { once: true }); // behind the hole, seen from the tee
  return t.tee(0, 0, 1.5).cup(0, top, -26);
};
