import { hole } from '../lib.mjs';

// La Cuvette: two funnels in a row. A small saucer first: everyone converges on its 3 x 3 bottom.
// A notch in its north rim lets the balls out one by one, down a chute onto the balcony of the big
// bowl, the cup at its bottom. A low wall between two posts stops them on the balcony: the bowl is
// entered on either side of it, at a slant.
export default () => {
  // a square funnel: bottom 2c wide at height y0, slopes up to a rim 2s wide at height y1
  const funnel = (cx, cz, c, s, y0, y1) => {
    t.floor(cx - c, cz - c, cx + c, cz + c, y0);
    t.slab([cx, y1, cz + s], [cx, y0, cz + c], 2 * s).slab([cx, y1, cz - s], [cx, y0, cz - c], 2 * s)
      .slab([cx - s, y1, cz], [cx - c, y0, cz], 2 * s).slab([cx + s, y1, cz], [cx + c, y0, cz], 2 * s);
  };
  const t = hole('La Cuvette', { theme: 'bocage', par: 3 });
  // the saucer: 9 x 9, rim 1.6 high, bottom 3 x 3 at 1; the tee on a balcony at its south rim
  const sz = -5.5, sr = 4.5, sy = 1.6, xn = 0; // its center, half-size, rim height; the notch
  funnel(0, sz, 1.5, 4, 1, sy);
  t.floor(-sr, sz - sr, sr, sz - 4, sy).floor(-sr, sz + 4, sr, sz + sr, sy).floor(-sr, sz - 4, -4, sz + 4, sy).floor(4, sz - 4, sr, sz + 4, sy);
  t.floor(-2, sz + sr, 2, 1, sy); // the tee balcony
  t.rail(0.45, [-2, sy, sz + sr], [-2, sy, 1], [2, sy, 1], [2, sy, sz + sr], [sr, sy, sz + sr], [sr, sy, sz - sr], [xn + 1, sy, sz - sr]);
  t.rail(0.45, [xn - 1, sy, sz - sr], [-sr, sy, sz - sr], [-sr, sy, sz + sr], [-2, sy, sz + sr]);
  // the chute, from the notch down to the balcony of the bowl
  const bz = -13; // the south edge of the balcony
  t.slab([xn, sy, sz - sr], [xn, 1, bz], 2);
  t.rail(1.2, [xn - 1, sy, sz - sr], [xn - 1, 1, bz]).rail(1.2, [xn + 1, sy, sz - sr], [xn + 1, 1, bz]); // tall: a ball flying out of the notch stays in
  // the bowl, as built first: 14 x 14, rim 1 high, bottom 3 x 3, cup at its center
  const cz = bz - 10, c = 1.5, s = 5.5, R = 7, rim = 1;
  funnel(0, cz, c, s, 0, rim);
  t.floor(-R, cz - R, R, cz - s, rim).floor(-R, cz + s, R, cz + R, rim).floor(-R, cz - s, -s, cz + s, rim).floor(s, cz - s, R, cz + s, rim);
  t.floor(-3, cz + R, 3, bz, rim); // its balcony
  t.rail(0.45, [xn + 1, rim, bz], [3, rim, bz], [3, rim, cz + R], [R, rim, cz + R], [R, rim, cz - R], [-R, rim, cz - R], [-R, rim, cz + R], [-3, rim, cz + R], [-3, rim, bz], [xn - 1, rim, bz]);
  t.rail(0.45, [-1.2, rim, bz - 3], [1.2, rim, bz - 3]); // a low wall stops what comes down the chute
  t.post(-1.2, bz - 3, rim).post(1.2, bz - 3, rim); // two posts at its ends: the bowl is entered at a slant, on either side
  t.disc('strokes', 0, cz - 6.25, 0.4, rim, { add: -1 }, { once: true }); // the coin, on the far rim
  return t.tee(0, sy, 0).cup(0, 0, cz);
};
