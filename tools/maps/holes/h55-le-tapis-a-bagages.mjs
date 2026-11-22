import { hole } from '../lib.mjs';

// Le Tapis à Bagages: a wide conveyor (6 u/s²) runs in a U round an island where the cup is: north
// up the west side, east along the north, south down the east side, into a sand bin, the lost
// property. The island's wall has three exits; to get in, cross the belt while it carries you, and
// aim upstream of an exit. A scoop just downstream of each exit picks up what slides along the wall
// and turns it in; what passes wide of the wall goes all the way round to the bin, which has a back
// door into the island. The exits are staggered: a ball scooped in does not cross straight out of
// the far one, and no scoop sends it on the cup.
export default () => {
  const t = hole('Le Tapis à Bagages', { theme: 'ville', par: 3 });
  const A = 6, X = 9, I = 4; // the belt's push, the outer half-width, the island's half-width
  const zs = -6, zn = -14, zo = -19; // the island's south and north walls, the outer north wall
  const belt = (x0, z0, x1, z1, accel) => t.pad('wind', x0, z0, x1, z1, 0, { accel });
  // floors: the lawn of the tee (south-west), the bin (south-east), the belt's floor, the island
  t.floor(-X, 1, 1, -4).floor(-I, -4, 1, zs);
  t.floor(1, 1, X, -4, 0, 'sand').floor(1, -4, I, zs, 0, 'sand');
  t.floor(-X, -4, -I, zo).floor(-I, zn, X, zo).floor(I, zn, X, -4);
  t.floor(-I, zn, I, zs);
  belt(-X, -4, -I, zo, [0, 0, -A]); // west side, north
  belt(-X, zn, X, zo, [A, 0, 0]); // north side, east (the corners add up: they push along the diagonal walls)
  belt(I, zo, X, -4, [0, 0, A]); // east side, south, into the bin
  // outer walls, diagonal in the two far corners, and the wall between the lawn and the bin
  t.rail(0.6, [-X, 0, 1], [-X, 0, zo + 2], [-X + 2, 0, zo], [X - 2, 0, zo], [X, 0, zo + 2], [X, 0, 1], [-X, 0, 1]);
  t.rail(0.6, [1, 0, 1], [1, 0, zs]);
  // the island's wall: exits west (z -6.5 to -8.5), north (x 1 to 3), east (z -11.5 to -13.5),
  // and the back door (x 1.5 to 3.5) on the bin's side
  t.rail(0.6, [-I, 0, -8.5], [-I, 0, zn], [1, 0, zn]);
  t.rail(0.6, [3, 0, zn], [I, 0, zn], [I, 0, -13.5]);
  t.rail(0.6, [I, 0, -11.5], [I, 0, zs], [3.5, 0, zs]);
  t.rail(0.6, [1.5, 0, zs], [-I, 0, zs], [-I, 0, -6.5]);
  // the scoops: 1.4 u at 45°, from the downstream corner of each exit, leaning back over it
  t.rail(0.6, [-I, 0, -8.5], [-I - 1, 0, -7.5]);
  t.rail(0.6, [3, 0, zn], [2, 0, zn - 1]);
  t.rail(0.6, [I, 0, -11.5], [I + 1, 0, -12.5]);
  // seven posts in a ring round the cup, open to the south only: a ball flung in by the belt never
  // runs straight in; the cup is putted to from the south of the island
  const cx = -1, cz = -9.8;
  for (let k = 1; k < 8; k++) t.post(cx + 1.1 * Math.sin(k * Math.PI / 4), cz + 1.1 * Math.cos(k * Math.PI / 4), 0, 0.25);
  return t.tee(-5, 0, -1).cup(cx, 0, cz);
};
