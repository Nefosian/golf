import { hole } from '../lib.mjs';

// Le Skatepark: a skate plaza, no corridor. From the deck of the tee an incline drops into the
// plaza; a mini-ramp (a half-pipe) runs across it; the cup sits on the flat top of a funbox, a
// block with a ramp on its south and north faces; a quarter-pipe against the back wall sends
// back whatever goes past, slower. The risky line is the rail: a 0.8 wide beam from the deck
// straight onto the funbox.
export default () => {
  const t = hole('Le Skatepark', { theme: 'ville', par: 3 });
  const X = 9, H = 0.45, DY = 0.8; // half-width of the plaza, wall height, deck and funbox height
  const z0 = -1, z1 = -3.5; // the incline from the deck down to the plaza
  const m0 = -5, m1 = -10, md = 0.8; // the mini-ramp: its edges and depth (flat bottom 1 u)
  const cz = -16, fw = 3, ft = 1.25, fr = 3; // the funbox: center, half-width, half-length of its top, of the whole
  const q0 = -21.5, q1 = -23, qh = 1.5; // the quarter: foot, back wall, height (45°)
  // a slab filled underneath with steps, so that no ball rolls under it (as Le Puy)
  const mound = (za, ya, zb, yb, x0, x1) => {
    t.slab([(x0 + x1) / 2, ya, za], [(x0 + x1) / 2, yb, zb], x1 - x0);
    const k = (yb - ya) / (zb - za), drop = 0.5 * Math.hypot(1, k) + 0.01, n = Math.ceil(Math.abs(zb - za) / 0.25);
    for (let i = 0; i < n; i++) {
      const za_ = za + (zb - za) * i / n, zb_ = za + (zb - za) * (i + 1) / n;
      const top = Math.min(ya + k * (za_ - za), ya + k * (zb_ - za)) - drop;
      if (top > 0.02) t.block(x0, za_, x1, zb_, 0, top);
    }
  };
  // act 1: the deck and the incline
  t.floor(-X, z0, X, 2, DY);
  t.slab([0, DY, z0], [0, 0, z1], 2 * X);
  t.floor(-X, m0, X, z1);
  // act 2: the mini-ramp, 0.8 deep
  const mb0 = (m0 + m1) / 2 + 0.5, mb1 = mb0 - 1;
  t.slab([0, 0, m0], [0, -md, mb0], 2 * X).floor(-X, mb1, X, mb0, -md).slab([0, -md, mb1], [0, 0, m1], 2 * X);
  // the plaza round the funbox, cut under its top (the cup's floor is one solid block)
  t.floor(-X, cz + ft, X, m1).floor(-X, q0, X, cz - ft).floor(-X, cz - ft, -fw, cz + ft).floor(fw, cz - ft, X, cz + ft);
  // act 3: the funbox, ramps at 24.6° on its south and north faces, sheer sides
  t.block(-fw, cz - ft, fw, cz + ft, -0.5, DY, { kind: 0 });
  mound(cz + fr, 0, cz + ft, DY, -fw, fw); mound(cz - fr, 0, cz - ft, DY, -fw, fw);
  // the quarter, against the back wall
  t.slab([0, 0, q0], [0, qh, q1], 2 * X);
  // the rail: from the deck straight to the funbox's top, over the incline and the mini-ramp
  t.floor(-0.4, cz + ft, 0.4, z0, DY);
  // walls: tall at the back and over the quarter
  t.rail(H, [-X, DY, 2], [X, DY, 2]).rail(H, [-X, DY, 2], [-X, DY, z0], [-X, 0, z1], [-X, 0, m0], [-X, -md, mb0], [-X, -md, mb1], [-X, 0, m1], [-X, 0, q0], [-X, qh, q1]);
  t.rail(H, [X, DY, 2], [X, DY, z0], [X, 0, z1], [X, 0, m0], [X, -md, mb0], [X, -md, mb1], [X, 0, m1], [X, 0, q0], [X, qh, q1]);
  t.rail(1, [-X, qh, q1], [X, qh, q1]);
  return t.tee(0, DY, 0.5).cup(-1.8, DY, cz);
};
