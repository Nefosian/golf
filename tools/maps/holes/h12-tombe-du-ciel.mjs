import { hole, V } from '../lib.mjs';

// Tombé du Ciel: two portals that come out in the sky. The ball keeps its speed and falls: slow,
// it lands short; fast, it lands far. A runway, a big island 5 below the first exit, a smaller
// green 8 below the second, open at its far end.
export default () => {
  const t = hole('Tombé du Ciel', { theme: 'nuit', par: 3, maxStrokes: 10 });
  const wy = -0.3; // water level
  // the runway, walled all round, and the first portal.
  t.floor(-2, -7, 2, 2).fence(-2, -7, 2, 2);
  t.disc('teleport', 0, -5, 0.7, 0, { to: [0, 5.18, -11.5] });
  // the big island, 8 x 12, a back rail behind the second portal; water all round.
  t.floor(-4, -23, 4, -11).rail(0.45, [-4, 0, -23], [4, 0, -23]);
  t.disc('teleport', 0, -21, 0.7, 0, { to: [9.5, 8.18, -12.6] });
  // the green, 6 x 10, tall side rails (a ball dropped 8 bounces 0.7 high), nothing at its far end.
  // The second exit is on its west side and the cup 30° off its line: a ball that rolled straight
  // on from the first drop falls past the cup; only a ball sent into the portal on a slant drops on it.
  t.floor(8, -22, 14, -12).rail(1, [8, 0, -22], [8, 0, -12], [14, 0, -12], [14, 0, -22]);
  // the water, around the islands (never under the cup).
  for (const [x0, z0, x1, z1] of [[-7, -11, 17, -8], [-7, -26, -4, -11], [4, -26, 8, -11], [-4, -26, 4, -23], [8, -26, 14, -22], [14, -26, 17, -11]]) t.water(x0, z0, x1, z1, wy);
  // checkpoint curtains: tall bands under each exit, which a falling ball goes through.
  t.zone('checkpoint', { shape: 0, c: V(0, 3, -11.6), h: V(4, 3, 0.4), params: { at: [0, 0, -11.6] } });
  t.zone('checkpoint', { shape: 0, c: V(11, 4.5, -12.6), h: V(3, 4.5, 0.4), params: { at: [11, 0, -12.6] } });
  return t.tee(0, 0, 0.5).cup(12.5, 0, -18.5);
};
