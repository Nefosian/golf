import { hole } from '../lib.mjs';

// Le Donjon: three nested enclosures, the cup in the keep. The blue key and the curtain's door lie
// across the bailey from the tee; the vermilion key just inside that door, the keep's door across
// the inner ring: each ring is half a lap, either way round. The corners of the rings are cut at
// 45°, so a well judged shot turns them.
export default () => {
  const t = hole('Le Donjon', { theme: 'chateau', par: 5, maxStrokes: 12 });
  const H = 0.45, zc = -8.6; // wall height, the keep's center
  const A = 10.75, B = 6.45, K = 3.15; // half sizes of the wall centerlines: outer wall, curtain, keep
  const cA = 3, cB = 2; // corner cuts of the outer wall and the curtain
  // a square wall of half size h round (0, zc), corners cut by c, with a door gap of half width g
  // in its north (s = -1) or south (s = 1) side
  const wall = (h, c, g, s) => {
    const p = [[g, s * h], [h - c, s * h], [h, s * (h - c)], [h, -s * (h - c)], [h - c, -s * h], [-h + c, -s * h], [-h, -s * (h - c)], [-h, s * (h - c)], [-h + c, s * h], [-g, s * h]];
    t.rail(H, ...p.map(([x, z]) => [x, 0, zc + z]));
  };
  const door = (h, s, key) => t.block(-1.15, zc + s * h - 0.15, 1.15, zc + s * h + 0.15, -0.15, H, { key });
  t.floor(-A, zc - A, A, zc + A);
  wall(A, cA, 0, -1);
  // act 1: the bailey (4 wide), round either way: the blue key and the curtain's door on the far side
  wall(B, cB, 1, -1);
  door(B, -1, 1);
  t.disc('key', 0, zc - 8.6, 0.45, 0, { key: 1 });
  // act 2: inside the curtain (3 wide), the vermilion key just inside its door, the keep's door on
  // the far side, round either way again
  wall(K, 0, 1, 1);
  door(K, 1, 2);
  t.disc('key', 0, zc - 4.8, 0.45, 0, { key: 2 });
  // act 3: the keep, 6 x 6, the cup in the middle
  return t.tee(0, 0, 0).cup(0, 0, zc);
};
