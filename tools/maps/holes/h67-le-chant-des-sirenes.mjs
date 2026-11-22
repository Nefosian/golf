import { hole } from '../lib.mjs';

// Le Chant des Sirènes: a wide fairway, and sirens along it: a reef (a rock in a small pool) inside a
// weak magnet. It never moves a ball at rest but bends whatever rolls by, the slower the more. One
// siren on the left, then two staggered (a curve left, then right), and the green between two, behind
// a low wall with a 4 wide gate (no long straight shot or bank runs into the cup).
export default () => {
  const t = hole('Le Chant des Sirènes', { theme: 'quai', par: 4, maxStrokes: 10 });
  const X = 6, Z = -46, R = 3.5, PULL = 2; // half-width, far end, magnet radius and pull (under the 2.2 of friction)
  t.floor(-X, Z, X, 2).fence(-X, Z, X, 2);
  // a siren: the rock, the pool round it, the song
  const siren = (x, z) => {
    t.post(x, z, 0, 0.25);
    t.disc('hazard', x, z, 0.7);
    t.disc('magnet', x, z, R, 0, { at: [x, 0, z], accel: PULL });
  };
  siren(-2.6, -9); // act 1: one siren, left
  siren(-2.4, -19); siren(2.4, -27.5); // act 2: two, staggered
  t.disc('strokes', -2.4, -17.9, 0.35, 0, { add: -1 }, { once: true }); // the coin, at the foot of the second reef: past it, the pool
  // act 3: a low wall across, the green behind its 4 wide gate, between two sirens
  t.rail(0.45, [-6, 0, -35], [-2, 0, -35]).rail(0.45, [2, 0, -35], [6, 0, -35]);
  siren(-3, -39); siren(3.4, -42);
  return t.tee(0, 0, 0).cup(0.8, 0, -43.5);
};
