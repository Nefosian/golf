import { hole } from '../lib.mjs';

// Le Ring: a boxing ring, 17 x 17. The four ropes are bumpers, and 2.5 u of sand lies at their foot, inside
// and out, where every kick (9 u/s) dies. A jumppad in front of the south rope, at the foot of a little slope, is the only way in:
// too soft and the ball falls short in the outer sand, or hits the rope and dies there; once in,
// nobody gets out. The cup is in the middle of the grass square, between four small posts.
export default () => {
  const t = hole('Le Ring', { theme: 'nuit', par: 3 });
  const R = 8.5, rz = -6.3, cz = rz - R; // the ring's half-size, its south rope, its center
  const S = 2.5; // the sand at the foot of the ropes
  // the lawn and the jump: a pad 0.8 deep, then the outer sand up to the south rope
  const L = 0.15; // the lawn: 0.15 above the pad, a 10° slope down to it: nothing crawls onto the pad
  t.floor(-R, -2.2, R, 3, L);
  t.slab([0, L, -2.2], [0, 0, -3], 2 * R);
  t.floor(-R, rz + S, R, -3);
  t.floor(-R, rz, R, rz + S, 0, 'sand');
  t.pad('jumppad', -R + 1, -3.8, R - 1, -3, 0, { speed: 6.5 });
  t.rail(1.6, [-R, 0, -3], [-R, L, -2.2], [-R, L, 3], [R, L, 3], [R, L, -2.2], [R, 0, -3]); // tall: a ball kicked off the rope's edge stays in
  t.rail(1.6, [-R, 0, rz], [-R, 0, -3.8], [-R + 1, 0, -3], [-R, 0, -3]).rail(1.6, [R, 0, rz], [R, 0, -3.8], [R - 1, 0, -3], [R, 0, -3]); // the pad's ends: a ball hopping along it is turned north, off it
  // the ring: sand all round, a 12 x 12 grass square in the middle
  const g = R - S;
  t.floor(-g, cz - g, g, cz + g);
  t.floor(-R, cz + g, R, rz, 0, 'sand').floor(-R, cz - R, R, cz - g, 0, 'sand')
    .floor(-R, cz - g, -g, cz + g, 0, 'sand').floor(g, cz - g, R, cz + g, 0, 'sand');
  t.rail(0.5, [-R, 0, rz], [R, 0, rz], 'bumper'); // the south rope, jumped over
  t.block(-R, rz + 0.2, R, rz - 0.2, 0.5, 0.56); // its cap, a plain wall: a bumper's top would kick a ball landing on it out of the ring
  t.rail(1.6, [R, 0, rz], [R, 0, cz - R], [-R, 0, cz - R], [-R, 0, rz], 'bumper'); // the others: a slanted jump does not clear them
  for (const [x, z] of [[0, 1.2], [0, -1.2], [-1.2, 0], [1.2, 0]]) t.post(x, cz + z, 0, 0.25); // a cross: no straight run-in from the jump
  return t.tee(-2, L, 1).cup(0, 0, cz);
};
