import { hole, roundRect, disc } from '../lib.mjs';

// Le Trou Noir (easy, par 2): the cup is a black hole. Round it, a vortex pulls a ball in and whirls it
// round: a ball that comes near spirals down into the cup, the way it turns. Two comets slide by, out
// of its pull, and knock away what crosses their path. Shoot so that the swirl brings the ball in, not out
// against the wall. The coin by the wall.
export default () => {
  const t = hole('Le Trou Noir', { theme: 'galaxie', par: 2 });
  const [cx, cz, R] = [0, -18, 9];
  t.plate(roundRect(-4, -3, 4, 3, 1.5), 0, { open: [[0, -3, 6]] });
  t.path([0, 0, -3], [0, -1], { width: 6 }).reach(cx, cz, R).done();
  t.vortex(cx, cz, 3.2, 0, { accel: 3.5, swirl: 1.6 }); // its swirl under the rolling resistance (2.2): a ball never circles for ever
  t.slider(cx - 3, cz - 7.2, cx - 1.8, cz - 6.2, 0, 0.5, [4.8, 0], { period: 4 }); // two comets, out of its pull
  t.slider(cx + 6.2, cz - 2.6, cx + 7.2, cz - 1.4, 0, 0.5, [0, 4], { period: 4.6, phase: 0.5 });
  for (const a of [20, 160]) t.post(cx + 7.6 * Math.cos(a * Math.PI / 180), cz + 7.6 * Math.sin(a * Math.PI / 180), 0, 0.5); // asteroids
  t.disc('strokes', cx - 5.9, cz - 5.9, 0.45, 0, { add: -1 }, { once: true });
  return t.green(disc(cx, cz, R), 0, cx, cz, { open: [[cx, cz + R, 6.2]] }).tee(0, 0, 1.5);
};
