import { hole } from '../lib.mjs';

// Le Carrefour: a loop that crosses its own path; pads send the balls through the crossing twice.
// At the end of the west arm a second pad sends them round a second loop, whose last leg comes
// back down onto the arm: a pad turns the balls south and a jump throws them over the arm (and
// whoever rolls on it) into the pocket of the cup.
export default () => {
  const t = hole('Le Carrefour', { theme: 'ville', par: 4 });
  const W = 0.45;
  // the first loop (built for the prototype): south arm, crossing, loop, west pad, crossing again.
  t.floor(-2, -8, 2, 2).floor(-2, -12, 2, -8).floor(-2, -18, 2, -12).floor(-2, -22, 10, -18).floor(6, -18, 10, -12).floor(2, -12, 10, -8);
  t.rail(W, [-2, 0, -12], [-2, 0, -22], [10, 0, -22], [10, 0, -8], [2, 0, -8], [2, 0, 2], [-2, 0, 2], [-2, 0, -8]);
  t.rail(W, [2, 0, -12], [6, 0, -12], [6, 0, -18], [2, 0, -18], [2, 0, -12]);
  t.rail(W, [-2, 0, -20], [0, 0, -22]).rail(W, [8, 0, -22], [10, 0, -20]).rail(W, [10, 0, -10], [8, 0, -8]); // corners at 45°
  t.pad('speedpad', -2, -6.5, 2, -5.5, 0, { dir: [0, 0, -1], speed: 12 });
  t.pad('speedpad', 3, -12, 4, -8, 0, { dir: [-1, 0, 0], speed: 12 }); // the ball dies around x = -16
  t.pad('jumppad', -1.9, -4.1, -0.9, -2.9, 0, { speed: 7 }); // the corner jump into the west arm
  // the west arm, to x = -24, and the second loop: up (x -24 to -20), east along z -20 to -24, and
  // down (x -14 to -10) back onto the arm.
  t.floor(-24, -12, -2, -8).floor(-24, -20, -20, -12).floor(-24, -24, -10, -20).floor(-14, -20, -10, -12);
  t.rail(W, [-2, 0, -8], [-24, 0, -8], [-24, 0, -22], [-22, 0, -24], [-12, 0, -24], [-10, 0, -22], [-10, 0, -12], [-2, 0, -12]);
  t.rail(W, [-20, 0, -12], [-20, 0, -20], [-14, 0, -20], [-14, 0, -12], [-20, 0, -12]);
  t.pad('speedpad', -24, -12, -22.5, -8, 0, { dir: [0, 0, -1], speed: 12 }); // the end pad, north: 2 u past where the corner jump dies
  t.pad('speedpad', -20, -24, -19, -20, 0, { dir: [1, 0, 0], speed: 12 }); // carries it on east
  t.pad('speedpad', -14, -16.5, -10, -15.5, 0, { dir: [0, 0, 1], speed: 10 }); // the last leg's pad, south
  t.pad('jumppad', -14, -13.4, -10, -12.6, 0, { speed: 7 }); // 0.78 s of flight, 7 of reach
  // the pocket, south of the arm behind its low wall (z = -8): tall walls elsewhere, so that the
  // corner jump cannot reach it; its last 3 units are sand.
  t.floor(-16, -8, -8, -1).floor(-16, -1, -8, 2, 0, 'sand');
  t.rail(1.5, [-8, 0, -8], [-8, 0, 2], [-16, 0, 2], [-16, 0, -8]);
  return t.tee(0, 0, 0).cup(-9.3, 0, -3);
};
