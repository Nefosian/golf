import { hole, V } from '../lib.mjs';

// Tir Groupé: a cannon lobs every ball onto the same sand island; a plank leads to a second cannon.
// Both lead to a platform, where a third cannon lobs every ball again onto the last island: a ring
// of sand around the grass square of the cup. The first pile-up costs nothing, the last one decides.
export default () => {
  const t = hole('Tir Groupé', { theme: 'quai', par: 4, maxStrokes: 10 });
  const wy = -0.3; // water level
  t.floor(-5, -6, 6.5, 1); // lawn
  t.floor(-6, -23, 7.5, -6, wy);
  t.floor(-3, -20, 3, -12, 0, 'sand').floor(-1, -23, 1, -20).floor(-4, -29, 4, -23); // island, bridge, platform
  t.floor(5, -12, 6.2, -6).floor(4.6, -14, 6.6, -12); // plank, pontoon
  t.rail(0.45, [5, 0, -6], [-5, 0, -6], [-5, 0, 1], [6.5, 0, 1], [6.5, 0, -6], [6.2, 0, -6]);
  t.rail(0.45, [-4, 0, -23], [-4, 0, -29], [4, 0, -29], [4, 0, -23]);
  for (const [x0, z0, x1, z1] of [[-6, -12, 7.5, -6], [-6, -20, -3, -12], [3, -20, 7.5, -12], [-6, -23, -1, -20], [1, -23, 7.5, -20]])
    t.zone('hazard', { shape: 0, c: V((x0 + x1) / 2, wy + 0.15, (z0 + z1) / 2), h: V((x1 - x0) / 2, 0.15, (z1 - z0) / 2) });
  t.pad('checkpoint', -3, -16, 3, -15, 0, { at: [0, 0, -15.5] }); // a band where the cannon lands
  t.disc('launcher', 0, -4.5, 0.6, 0, { v: [0, 11.7, -7.5] });
  const B = [5.6, -13], aim = [-2.5, -25], d = Math.hypot(aim[0] - B[0], aim[1] - B[1]), vh = 7.5; // lands on the platform
  t.disc('launcher', B[0], B[1], 0.5, 0, { v: V((aim[0] - B[0]) / d * vh, 15, (aim[1] - B[1]) / d * vh) });
  // the last island, 8 x 9: a ring of sand around the 3 x 3 grass square of the cup, water all round
  // (never under the cup), a checkpoint band where cannon C's balls slide.
  const cz = -44.5;
  t.floor(-1.5, cz - 1.5, 1.5, cz + 1.5);
  t.floor(-4, cz + 1.5, 4, -38, 0, 'sand').floor(-4, -47, 4, cz - 1.5, 0, 'sand')
    .floor(-4, cz - 1.5, -1.5, cz + 1.5, 0, 'sand').floor(1.5, cz - 1.5, 4, cz + 1.5, 0, 'sand');
  for (const [x0, z0, x1, z1] of [[-6, -38, 7.5, -29], [-6, -47, -4, -38], [4, -47, 7.5, -38], [-6, -50, 7.5, -47]]) t.water(x0, z0, x1, z1, wy);
  t.pad('checkpoint', -4, -41.6, 4, -40.8, 0, { at: [0, 0, -41.2] });
  // cannon C, on the platform: 1.33 s of flight, 12.7 of reach.
  t.disc('launcher', 0, -27.5, 0.6, 0, { v: [0, 12, -9.5] });
  return t.tee(0, 0, -0.5).cup(0, 0, cz);
};
