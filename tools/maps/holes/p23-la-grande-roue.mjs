import { hole, roundRect, disc } from '../lib.mjs';

// La Grande Roue (medium, par 3): a round fairground floor with a big wheel lying on it: two bars
// crossed, turning slowly. Four bumper posts round it, two boosters on its sides. Through the wheel
// when a gap comes round, or round it on a booster; then up the alley to the green. A coin behind the
// wheel. Balls wait for the same gap.
export default () => {
  const t = hole('La Grande Roue', { theme: 'fete', par: 3 });
  const [cx, cz, R] = [0, -16, 8];
  t.plate(roundRect(-4, -3, 4, 3, 1.5), 0, { open: [[0, -3, 5]] });
  t.path([0, 0, -3], [0, -1], { width: 5 }).reach(cx, cz, R).done();
  t.path([0, 0, -27.3], [0, 1], { width: 5 }).reach(cx, cz, R).done();
  t.plate(disc(cx, cz, R), 0, { open: [[cx, cz + R, 5.3], [cx, cz - R, 5.3]] });
  t.spinner(cx, cz, 0, 3.4, { period: 6 }).spinner(cx, cz, 0, 3.4, { period: 6, phase: 0.25 });
  for (const a of [45, 135, 225, 315]) t.post(cx + 5.9 * Math.cos(a * Math.PI / 180), cz + 5.9 * Math.sin(a * Math.PI / 180), 0, 0.4, 0.45, 'bumper');
  t.pad('speedpad', -6.4, -17, -4.6, -15, 0, { dir: [0, 0, -1], speed: 11 });
  t.pad('speedpad', 4.6, -17, 6.4, -15, 0, { dir: [0, 0, -1], speed: 11 });
  t.disc('strokes', cx, cz - 6.2, 0.45, 0, { add: -1 }, { once: true });
  return t.green(roundRect(-6, -36, 6, -27, 2), 0, 0, -32, { open: [[0, -27, 5]] }).tee(0, 0, 1);
};
