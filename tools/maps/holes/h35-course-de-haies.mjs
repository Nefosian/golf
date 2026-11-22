import { hole, V } from '../lib.mjs';

// Course de Haies: hurdles across a corridor, a jumppad in front of each. Fast enough, the ball
// flies over; too soft, it lands on the short rise before the hurdle, rolls back onto the pad
// and is thrown back the way it came. The low hurdle, then the river (water behind the hurdle,
// a sand pit on the far bank, where every run ends), then the double, onto the green.
export default () => {
  const t = hole('Course de Haies', { theme: 'bocage', par: 4, maxStrokes: 10 });
  const W = 4, PD = 0.6, T = 0.15; // half-width, pad depth, hurdle thickness
  // hurdle: a pad from z down to z - PD, a rise of gap to the hurdle (0.25 up), the hurdle h high;
  // returns the z just past the hurdle.
  const hurdle = (z, gap, h) => {
    const zw = z - PD - gap;
    t.floor(-W, z - PD, W, z);
    t.slab([0, 0, z - PD], [0, 0.25, zw], 2 * W);
    t.block(-W, zw, W, zw - T, -0.5, 0.25 + h);
    // the zone is taller than the jump: a ball falling back on the pad does not enter it again
    t.zone('jumppad', { shape: 0, c: V(0, 0.8, z - PD / 2), h: V(W, 0.8, PD / 2), params: { speed: 6 } });
    return zw - T;
  };
  t.floor(-W, -5, W, 2); // the start
  let z = hurdle(-5, 0.6, 0.3); // the low hurdle: even a soft ball gets over
  const l1 = z - 8; // the first lawn
  t.floor(-W, l1, W, z);
  z = hurdle(l1, 1, 0.5); // the river: 2 u of water behind the hurdle
  t.water(-W, z - 2, W, z);
  z -= 2;
  const pit = z - 4.5; // the sand pit
  t.floor(-W, pit, W, z, 0, 'sand');
  t.pad('checkpoint', -W, z, W, z - 0.5, 0, { at: [0, 0, z - 2.25] }, { h: V(W, 1.5, 0.25), c: V(0, 1.5, z - 0.25) }); // tall: a ball landing over it takes it
  t.floor(-W, pit - 2, W, pit);
  z = hurdle(pit - 2, 1, 0.5); // the double: two hurdles 3 u apart
  t.floor(-W, z - 1.4, W, z);
  z = hurdle(z - 1.4, 1, 0.5);
  const zg = z - 8; // the green
  t.floor(-W, zg, W, z);
  for (const x of [-W, W]) t.rail(1.2, [x, 0, 2], [x, 0, zg]); // the side walls, tall over the slopes and blocks
  t.rail(0.45, [-W, 0, 2], [W, 0, 2]).rail(0.45, [-W, 0, zg], [W, 0, zg]);
  // the cup, in the finish hut: open to the west, roofed, so a ball coming over the double has to
  // be putted in. The roof slopes west: nothing rests on it.
  const cz = zg + 3.5, hx = 0.8;
  t.rail(0.9, [W, 0, cz + 1.2], [hx, 0, cz + 1.2]).rail(0.9, [W, 0, cz - 1.2], [hx, 0, cz - 1.2]);
  t.slab([W, 1.5, cz], [hx - 0.2, 0.9, cz], 2.7);
  return t.tee(0, 0, 0).cup(2.4, 0, cz);
};
