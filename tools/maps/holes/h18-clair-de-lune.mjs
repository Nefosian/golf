import { hole, V } from '../lib.mjs';

// Clair de Lune: on the Moon (gravity 5), a jump lasts two seconds. A jumppad at the edge of each
// island throws the ball up at 5: the speed it rolls on at picks where it lands, 2 s × that speed
// further. The first jump crosses a sea of sand (1 lower): too short, the ball lands in it without
// penalty, and a pad at the foot of the cliff throws it back up. Then the big island, sand to stop
// on, over the void this time; then the green, 4 wide; or the peak and its coin on the way. The cup
// is in a small room behind the green's tall back wall, putted into through a low hole.
export default () => {
  const t = hole('Clair de Lune', { theme: 'nuit', par: 3, maxStrokes: 10, gravity: 5 });
  const X = 4, J = 5; // half-width of the islands, jumppad speed
  const solid = (x0, z0, x1, z1, y, material) => t.block(x0, z0, x1, z1, y - 1.5, y, { kind: 0, ...(material ? { material } : {}) });
  // the tee island, its pads at its north edge
  solid(-X, -3, X, 3, 0);
  t.rail(0.45, [-X, 0, -3], [-X, 0, 3], [X, 0, 3], [X, 0, -3]);
  t.pad('jumppad', -X, -3, X, -2, 0, { speed: J });
  // the sea of sand, 1 lower, walled on its sides; the pad at the foot of the cliff
  solid(-X, -8, X, -3, -1, 'sand');
  t.rail(1.45, [-X, -1, -3], [-X, -1, -8]).rail(1.45, [X, -1, -3], [X, -1, -8]);
  t.pad('jumppad', -X, -7.6, X, -6.6, -1, { speed: J });
  // the big island, sand, its pads on a strip of grass at its north edge; a checkpoint band
  solid(-X, -12, X, -8, 0, 'sand');
  solid(-X, -13, X, -12, 0);
  t.pad('jumppad', -X, -13, X, -12, 0, { speed: J });
  t.pad('checkpoint', -X, -9.6, X, -9, 0, { at: [0, 0, -10] });
  // the peak, sand, with the coin and a pad of its own
  solid(1.5, -18.75, 4, -16.25, 0, 'sand');
  solid(1.5, -19.5, 4, -18.75, 0);
  t.pad('jumppad', 1.5, -19.5, 4, -18.75, 0, { speed: J });
  t.disc('strokes', 2.75, -17.3, 0.5, 0, { add: -1 }, { once: true });
  // the green, 4 wide, walled. Its back wall is tall, so a jump never ends in the cup: the cup is
  // in a small room behind it, putted into through a low hole in the wall.
  const zw = -28.5, zr = -31.5, H = 3; // the wall, the room's back, wall height
  solid(-2, zr, 2, -21, 0);
  t.rail(0.45, [-2, 0, -21], [-2, 0, zw]).rail(0.45, [2, 0, -21], [2, 0, zw]);
  t.rail(H, [-2.15, 0, zw], [-2.15, 0, zr - 0.15], [2.15, 0, zr - 0.15], [2.15, 0, zw]);
  t.block(-2, zw - 0.15, 0.2, zw + 0.15, -0.1, H).block(1.7, zw - 0.15, 2, zw + 0.15, -0.1, H); // the wall, but the hole
  t.block(0.2, zw - 0.15, 1.7, zw + 0.15, 0.7, H); // above the hole
  t.pad('checkpoint', -2, -22.1, 2, -21.5, 0, { at: [0, 0, -22.5] });
  return t.tee(0, 0, 1).cup(-0.6, 0, -30.4);
};
