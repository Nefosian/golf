import { hole, V } from '../lib.mjs';

// Les Taupes: striped moles pop out of the ground and back. Down, a ball rolls over them; up, they
// are posts; and one that comes up under a ball throws it about. A row of six closes the alley,
// two circles of them guard the cup.
export default () => {
  const t = hole('Les Taupes', { theme: 'bocage', par: 3 });
  const H = 1.6, cz = -14; // a high fence: a ball meeting a mole's rim as it comes up can fly 2 high
  // a mole at (x, z): its top 'low' under the ground when down, 'high' above it when up. A shallow
  // one blocks longer (it is above a ball's center 60% of the time from 0.05 under); a deep one
  // comes up faster under a ball, and throws it further.
  const mole = (x, z, r, period, phase, low, high) => t.raw({
    shape: 1, kind: 2, c: V(x, -low - 0.7, z), r, hh: 0.7,
    motion: { period, phase: ((phase % 1) + 1) % 1, move: V(0, low + high, 0), pivot: [0, 0, 0], axis: [0, 0, 0] },
  });
  // act 1: the alley, 8 wide; its row of six moles rises one after the other, so the gap between
  // them (too narrow for a ball when up) walks from left to right
  t.floor(-4, -7, 4, 2.5);
  for (let i = 0; i < 6; i++) mole(-3.33 + i * 1.333, -3.5, 0.55, 3, -i / 6, 0.05, 0.75);
  // the green, 10 x 10 around the cup
  t.floor(-5, cz - 5, 5, -7);
  t.rail(H, [-4, 0, -7], [-4, 0, 2.5], [4, 0, 2.5], [4, 0, -7]);
  t.rail(H, [-4, 0, -7], [-5, 0, -7], [-5, 0, cz - 5], [5, 0, cz - 5], [5, 0, -7], [4, 0, -7]);
  // act 2: the big circle, four slow moles 3.5 from the cup
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; mole(3.5 * Math.cos(a), cz + 3.5 * Math.sin(a), 0.6, 4, i / 4, 0.6, 0.5); }
  // act 3: the small circle, eight quick moles 2 from the cup (none on the tee's line): up, they
  // close it (gaps under a ball)
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) * Math.PI / 4; mole(2 * Math.cos(a), cz + 2 * Math.sin(a), 0.6, 2, i / 8, 0.2, 0.7); }
  return t.tee(0, 0, 0.5).cup(0, 0, cz);
};
