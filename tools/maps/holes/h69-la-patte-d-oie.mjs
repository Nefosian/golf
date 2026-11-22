import { hole, V } from '../lib.mjs';

// La Patte d'Oie: a crossroads with three branches: the blue key at the end of the west one, the
// vermilion key at the end of the east one, both doors on the north one, before the green. In the
// middle of the crossroads stands a slanted wall: a ball coming up from the tee glances off it into
// the west branch; one coming back from the east glances off it into the north branch. The east
// branch ends in a V that sends a ball back on the other side of its axis; the west branch has two
// chicanes. Everyone crosses the crossroads four times, each in their own order and direction.
export default () => {
  const t = hole("La Patte d'Oie", { theme: 'bocage', par: 5, maxStrokes: 12 });
  const W = 0.45;
  const door = (z, key) => t.block(-2, z - 0.15, 2, z + 0.15, -0.15, W, { key });
  // the stub of the tee (4 x 6) and the crossroads (6 x 6)
  t.floor(-2, -4, 2, 2).floor(-3, -10, 3, -4);
  t.rail(W, [-3, 0, -5], [-3, 0, -4], [-2, 0, -4], [-2, 0, 2], [2, 0, 2], [2, 0, -4], [3, 0, -4], [3, 0, -5]);
  t.rail(W, [-3, 0, -9], [-3, 0, -10], [-2, 0, -10]).rail(W, [2, 0, -10], [3, 0, -10], [3, 0, -9]);
  // the slanted wall: tee shots that hit it turn west; balls coming back west from the east branch
  // on its north side turn north; balls going east south of its end pass
  t.rail(W, [-1.2, 0, -8.8], [0.8, 0, -6.8]);
  // act 1: the west branch (4 x 10), two chicanes, the blue key at its end
  t.floor(-13, -9, -3, -5);
  t.rail(W, [-3, 0, -5], [-13, 0, -5], [-13, 0, -9], [-3, 0, -9]);
  t.rail(W, [-6.5, 0, -9], [-6.5, 0, -7.3]).rail(W, [-9.5, 0, -5], [-9.5, 0, -6.7]);
  t.disc('key', -12, -7, 0.5, 0, { key: 1 });
  // act 2: the east branch (4 x 7), flared into a V 6 wide: a ball that goes in comes back out on the
  // other side of the axis, the vermilion key along the V's axis
  t.floor(3, -9, 10, -5).floor(10, -10, 16, -4);
  t.rail(W, [3, 0, -5], [10, 0, -5], [10, 0, -4], [13, 0, -4], [16, 0, -7], [13, 0, -10], [10, 0, -10], [10, 0, -9], [3, 0, -9]);
  t.zone('key', { shape: 0, c: V(14.2, 0.25, -7), h: V(1.3, 0.25, 0.35), params: { key: 2 } });
  // act 3: the north branch, the blue door, the vermilion door, the green (6 x 6)
  t.floor(-2, -17, 2, -10).floor(-3, -23, 3, -17);
  t.rail(W, [-2, 0, -10], [-2, 0, -17], [-3, 0, -17], [-3, 0, -23], [3, 0, -23], [3, 0, -17], [2, 0, -17], [2, 0, -10]);
  door(-12.5, 1); door(-14.5, 2);
  return t.tee(0, 0, 0).cup(1, 0, -21);
};
