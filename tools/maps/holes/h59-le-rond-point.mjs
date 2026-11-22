import { hole } from '../lib.mjs';

// Le Rond-Point: a one-way roundabout, the sequel of Le Carrefour. The ring goes round a walled
// island anticlockwise; a speedpad launches each quarter, and a speed bump of sand stops the balls
// in front of the next exit. In from the south: join the ring on its pad, and choose at each exit.
// East, a dead end with a coin (and the ring to join again); north, the road to the green; miss it
// and it is one more lap. A path 1 wide cuts straight through the island, for the bold.
export default () => {
  const t = hole('Le Rond-Point', { theme: 'ville', par: 4 });
  const H = 0.45, zc = -16, R = 8, I = 4, C = 4; // ring center, outer and inner half-sizes, corner cut
  // (as wide as the lane: a pad's ball always meets the corner at 45°, never a wall head on)
  const zs = zc + R, zn = zc - R; // south and north edges of the ring
  // the ring's floor: grass, but for the four speed bumps (sand) before the exits
  // (the north one lies in the mouth of the north exit, where the path through the island comes out)
  const sand = [[4, zc + 2, R, zc + 5.5], [-2.5, zn, 0.5, zn + 4], [-R, zc - 5.5, -I, zc - 2], [-5.5, zs - 4, -2, zs]];
  const xs = [-R, R, ...sand.flatMap(r => [r[0], r[2]])].sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i);
  const zz = [zn, zs, ...sand.flatMap(r => [r[1], r[3]])].sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i);
  const isSand = (x, z) => sand.some(r => x > r[0] && x < r[2] && z > r[1] && z < r[3]);
  for (let i = 0; i + 1 < xs.length; i++)
    for (let j = 0; j + 1 < zz.length; j++)
      if (!isSand((xs[i] + xs[i + 1]) / 2, (zz[j] + zz[j + 1]) / 2)) t.floor(xs[i], zz[j], xs[i + 1], zz[j + 1]);
  for (const [x0, z0, x1, z1] of sand) t.floor(x0, z0, x1, z1, 0, 'sand');
  // the island, a low solid block, cut by its path
  t.block(-I, zc - I, -0.5, zc + I, -0.1, 0.6).block(0.5, zc - I, I, zc + I, -0.1, 0.6);
  // the roads: south from the tee, east to the coin, north to the green
  t.floor(-2, zs, 2, 2).floor(R, zc - 2, R + 5, zc + 2).floor(-2, zn - 6, 2, zn);
  const g = zn - 6; // the green, 8 x 8
  t.floor(-4, g - 8, 4, g);
  t.rail(H, [2, 0, zs], [R - C, 0, zs], [R, 0, zs - C], [R, 0, zc + 2], [R + 5, 0, zc + 2], [R + 5, 0, zc - 2], [R, 0, zc - 2],
    [R, 0, zn + C], [R - C, 0, zn], [2, 0, zn], [2, 0, g], [4, 0, g], [4, 0, g - 8], [-4, 0, g - 8], [-4, 0, g], [-2, 0, g], [-2, 0, zn],
    [-R + C, 0, zn], [-R, 0, zn + C], [-R, 0, zs - C], [-R + C, 0, zs], [-2, 0, zs], [-2, 0, 2], [2, 0, 2], [2, 0, zs]);
  // the pads, anticlockwise, just past each exit
  const sp = (x0, z0, x1, z1, dir) => t.pad('speedpad', x0, z0, x1, z1, 0, { dir, speed: 10 });
  sp(0.6, zs - 4, 3.5, zs - 0.5, [1, 0, 0]); // south side, east: up the right half of the road, and one is in (clear of the wall's end)
  sp(I, zc - 3.5, R, zc - 2.5, [0, 0, -1]); // east side, north
  sp(-3.5, zn, -2.5, zn + 4, [-1, 0, 0]); // north side, west
  sp(-R, zc - 1.5, -I, zc - 0.5, [0, 0, 1]); // west side, south
  t.disc('strokes', R + 1.6, zc, 0.7, 0, { add: -1 }, { once: true }); // the coin, in the east dead end
  // a low wall in front of the cup: no straight putt down the road, the green is entered on either side
  t.rail(H, [-1, 0, g - 3.5], [1, 0, g - 3.5]);
  return t.tee(0, 0, 0).cup(0, 0, g - 5);
};
