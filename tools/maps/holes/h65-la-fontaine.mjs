import { hole } from '../lib.mjs';

// La Fontaine: a portal in the middle of a basin, between four posts; it comes out just above the
// tip of a pyramid. A portal moves the ball, not its heading: it drops on the face it was heading
// for and runs down it. North is the green; east and west, side lawns behind low walls; south (or
// too slow), back down into the sand at the foot.
export default () => {
  const t = hole('La Fontaine', { theme: 'bocage', par: 3 });
  const W = 0.45, PZ = -15, S = 4, H = 2, N = 20; // the pyramid: center z, half size, height, strips per face
  // act 1: the basin, 8 x 10.5; the portal between four posts: wide gaps east and west, a tight
  // one north and south
  t.floor(-4, -8, 4, 2.5);
  t.rail(W, [4, 0, -11], [4, 0, 2.5], [-4, 0, 2.5], [-4, 0, -11]);
  t.disc('teleport', 0, -4.5, 0.6, 0, { to: [0, H + 0.9, PZ + 0.4] });
  for (const x of [-0.45, 0.45]) for (const z of [-3, -6]) t.post(x, z, 0, 0.22);
  // two mirrors on the sides, at the portal's height: a tee shot at one of them comes back across,
  // into a wide side gap (the safe entry); north is the tight gap
  for (const s of [-1, 1]) t.rail(W, [s * 2.58, 0, -5.29], [s * 3.42, 0, -3.71]);
  // the sand at the foot of the south face: nothing runs down from the pyramid into the portal
  t.floor(-4, -11, 4, -8, 0, 'sand');
  // act 2: the pyramid, 8 x 8, 2 high (27°): each face a stack of thin strips parallel to its base,
  // each as wide as the face at its middle (a groove a hair deep along the ridges, no flat on the tip)
  t.floor(-S, PZ - S, S, PZ + S); // the ground under it
  for (const [dx, dz] of [[0, -1], [0, 1], [1, 0], [-1, 0]])
    for (let i = 0; i < N; i++) {
      const d0 = S * i / N, d1 = S * (i + 1) / N;
      t.slab([dx * d0, H - H * d0 / S, PZ + dz * d0], [dx * d1, H - H * d1 / S, PZ + dz * d1], d0 + d1);
    }
  // act 3: the side lawns, 4 wide, along the pyramid and the green, behind low walls open at their
  // north end; tall outer walls (a fast ball flies off the tip); cut corners turn a ball onto the green
  t.floor(-8, -27, -4, -11).floor(4, -27, 8, -11);
  t.rail(1, [-8, 0, -11], [-4, 0, -11]).rail(1, [4, 0, -11], [8, 0, -11]);
  t.rail(1.5, [-8, 0, -11], [-8, 0, -25], [-6, 0, -27], [6, 0, -27], [8, 0, -25], [8, 0, -11]);
  t.rail(W, [-4, 0, -19], [-4, 0, -23]).rail(W, [4, 0, -19], [4, 0, -23]);
  // the green, 8 x 8, a sand trap behind the cup
  t.floor(-4, -25.5, 4, -19).floor(-4, -27, -2.5, -25.5).floor(2.5, -27, 4, -25.5);
  t.floor(-2.5, -27, 2.5, -25.5, 0, 'sand');
  return t.tee(0, 0, 0).cup(-1.6, 0, -24);
};
