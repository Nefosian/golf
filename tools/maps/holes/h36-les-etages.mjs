import { hole } from '../lib.mjs';

// Les Étages: four levels in steps of 1.5, the cup on the roof. A jumppad lies 1.4 before each step
// and throws the ball up: enter it gently, or the ball hits the step before it is high enough. The
// pads narrow and alternate sides; on the roof, a chimney hides the cup and the back has no rail.
export default () => {
  const t = hole('Les Étages', { theme: 'canyon', par: 4 });
  const X = 4, TOP = 7.5; // half-width, top of the side walls (over every jump)
  // [z front, z back, height] of the ground, the two floors and the roof
  const levels = [[3, -4, 0], [-4, -11, 1.5], [-11, -17, 3], [-17, -23, 4.5]];
  for (const [z0, z1, y] of levels) {
    if (y === 0) t.floor(-X, z0, X, z1, 0);
    else t.block(-X, z0, X, z1, -0.5, y, { kind: 0 }); // a solid level, one box: the roof holds the cup
  }
  t.block(-X - 0.3, 3, -X, -23, -0.5, TOP).block(X, 3, X + 0.3, -23, -0.5, TOP); // side walls
  t.rail(2.5, [-X, 0, 3], [X, 0, 3]); // tall: a ball thrown back by a step stays in
  // before each step: a thin pad, then a ramp up to the step that rolls a ball fallen there back
  // onto the pad (a dead ball on a pad would bounce for ever)
  const step = (zf, y, pads, speed) => {
    t.slab([0, y, zf + 0.9], [0, y + 0.15, zf], 2 * X);
    for (const [x0, x1] of pads) t.pad('jumppad', x0, zf + 1.4, x1, zf + 0.9, y, { speed });
  };
  step(-4, 0, [[-3, 3]], 11); // act 1: nearly the whole width
  step(-11, 1.5, [[-3.5, -0.5]], 11); // act 2: 3 wide, on the left
  step(-17, 3, [[0.4, 1.6], [2.6, 3.8]], 8.5); // act 3: two of 1.2 on the right, a softer jump
  t.block(-X, -18.6, 0.2, -19.8, 4.5, 5.3); // the chimney: the cup is putted to from behind it
  return t.tee(0, 0, 1.5).cup(-2, 4.5, -21.3);
};
