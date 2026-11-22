import { hole, V } from '../lib.mjs';

// La Douane Volante: three terraces 2 high round a sand court. A small cannon lobs every ball from the
// tee onto the middle terrace. Its big cannon fires over the court to the green, through a door that
// stands in mid-air: with the key, at the end of a narrow quay on the other side of the terrace, the
// ball flies through; without it, it crashes and drops into the sand, where a rescue cannon sends it
// to the far edge of the green.
export default () => {
  const t = hole('La Douane Volante', { theme: 'chateau', par: 4 });
  const Y = 2, W = 0.45; // terrace height, rails
  const terrace = (x0, z0, x1, z1) => t.block(x0, z0, x1, z1, -0.5, Y, { kind: 0 }); // solid to the court
  // act 1: the tee lawn and the small cannon, over the gap onto the terrace (rien à déclarer)
  terrace(-3, 2.5, 3, -3.5).fence(-3, 2.5, 3, -3.5, Y);
  t.disc('launcher', 0, -2, 0.7, Y, { v: [0, 14, -5.5] });
  // act 2: the terrace, 10 x 8; the big cannon at its west end, the quay of the key off its east side,
  // on the same line: the key, then off the end wall straight back into the cannon, is one long shot
  const qz = -14.5, qw = 1.25; // the quay's line, half-width
  terrace(-5, -9, 5, -17);
  t.rail(W, [5, Y, qz + qw], [5, Y, -9], [-5, Y, -9], [-5, Y, -17], [5, Y, -17], [5, Y, qz - qw]);
  terrace(5, qz + qw, 9, qz - qw); // the quay, no rail along it
  t.rail(W, [9, Y, qz + qw], [9, Y, qz - qw]); // its end wall
  t.disc('key', 8.1, qz, 0.5, Y, { key: 1 });
  const B = [-3.6, qz], aim = [0, -25.6], d = Math.hypot(aim[0] - B[0], aim[1] - B[1]), vh = 9;
  t.disc('launcher', B[0], B[1], 0.9, Y, { v: V((aim[0] - B[0]) / d * vh, 11, (aim[1] - B[1]) / d * vh) });
  // act 3: the douane, a door 4 wide standing 2 above the court, from 2 to 6.5 high, across the arc
  const dz = -22, dx = B[0] + (aim[0] - B[0]) * (B[1] - dz) / (B[1] - aim[1]);
  t.block(dx - 2, dz - 0.15, dx + 2, dz + 0.15, Y, 6.5, { key: 1 });
  // the court, at the foot: a band of sand where the door drops its balls, grass beyond, and the
  // strip under the quay (a ball off the quay lands there); walled all round
  t.floor(-5, -19.5, 10, -17, 0, 'sand').floor(-5, -24, 10, -19.5).floor(5, -17, 10, -9);
  t.rail(W, [5, 0, -9], [10, 0, -9], [10, 0, -24], [-5, 0, -24], [-5, 0, -17]);
  // the rescue cannon, at the back of the court: onto the west edge of the green, far from the cup
  t.disc('launcher', -3.5, -22, 0.7, 0, { v: [-0.6, 13, -3.2] });
  // the green, 12 x 10, raised (solid, clear of the cup's shaft); sand along its back stops the big
  // cannon's balls
  t.floor(-5, -32, 7, -24, Y).floor(-5, -34, 7, -32, Y, 'sand').block(-5, -34, 7, -24, -0.5, Y - 0.65);
  t.fence(-5, -24, 7, -34, Y);
  return t.tee(0, Y, 1.2).cup(4, Y, -27.5);
};
