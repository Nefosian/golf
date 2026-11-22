import { hole } from '../lib.mjs';

// Pile ou Face: a key opens every gate of its colour, standing doors and flat slabs alike: with it a
// ball goes through the door, and through the slab. The blue key, by the tee, is one to leave: its
// slab bridges a sand pit. Past it the road forks: the vermilion key opens the door of the wide
// road, but the short vermilion bridge over the sand ravine no longer bears whoever carries it.
// No water anywhere: a keyed ball put back on a gate would fall through for ever.
export default () => {
  const t = hole('Pile ou Face', { theme: 'chateau', par: 4 });
  const W = 0.45, D = -1.5; // rails, depth of the pit and the ravine
  const gate = (x0, z0, x1, z1, key) => t.block(x0, z0, x1, z1, -0.5, 0, { kind: 0, key }); // a flat gate, floor height
  const wall = (x0, z0, x1, z1, y0 = D, y1 = W) => t.block(x0, z0, x1, z1, y0, y1); // a wall standing in a pit

  // act 1: the tee, the blue key on the way, the blue slab in the neck (4 wide)
  t.floor(-3, -5, 3, 2);
  t.rail(W, [-2, 0, -5], [-3, 0, -5], [-3, 0, 2], [3, 0, 2], [3, 0, -5], [2, 0, -5]);
  t.disc('key', 0.35, -2.6, 0.45, 0, { key: 1 });
  gate(-2, -5, 2, -7.5, 1);
  wall(-2.3, -5, -2, -7.5); // the neck's west wall, down to the pit
  t.rail(W, [2, 0, -5], [2, 0, -7.5]); // its east wall hangs over the pit: a ball below rolls under it
  // the pit under the slab (sand), then a ramp east up to a ledge, whose cut corner turns a ball
  // north onto the junction
  t.floor(-2, -7.5, 2, -5, D, 'sand');
  t.slab([2, D, -6.25], [6, 0, -6.25], 2.5);
  wall(-2, -5, 3, -4.7, D, -0.5); wall(3, -5, 6, -4.7); // closes the pit under the tee
  wall(-2, -7.8, 2, -7.5, D, -0.5); wall(2, -7.8, 6, -7.5); // and under the junction
  t.floor(6, -7.5, 9, -5);
  t.rail(W, [6, 0, -5], [7.5, 0, -5], [9, 0, -6.5], [9, 0, -7.5]);

  // act 2: the junction, 18 x 7.5
  t.floor(-9, -15, 9, -7.5);
  t.rail(W, [-2, 0, -7.5], [-9, 0, -7.5], [-9, 0, -15]).rail(W, [9, 0, -7.5], [9, 0, -15]);
  // west: the sand ravine, 1.5 deep, crossed by the vermilion bridge (1.5 wide, no rail); the way out
  // is its south bank, a grass ramp back up to the junction under the bridge too
  gate(-3.4, -15, -1.9, -21, 2);
  t.post(-1.7, -12.3, 0, 0.35); // on the one line from the tee through the neck along the bridge
  t.floor(-9, -21, -1, -18.5, D, 'sand');
  t.slab([-5, D, -18.5], [-5, 0, -15], 8);
  wall(-9, -21.3, -1, -21, D, -0.5); wall(-9.3, -15, -9, -21); // under the green's edge; the ravine's west wall
  wall(-1.3, -15, -1, -21); // the ravine's east wall
  // east: the wide road, and its pocket: the vermilion key inside, the vermilion door at its north end
  t.floor(-1, -21, 9, -15);
  t.rail(W, [5, 0, -15], [9, 0, -15], [9, 0, -21]).rail(W, [5, 0, -15], [5, 0, -18.4]);
  t.disc('key', 7.6, -19.6, 0.45, 0, { key: 2 });
  t.block(5, -21.15, 9, -20.85, -0.15, W, { key: 2 });
  t.rail(W, [-1, 0, -21], [5, 0, -21]);

  // act 3: the green, 18 x 8; a rail along the ravine but where the bridge lands
  t.floor(-9, -29, 9, -21);
  t.rail(W, [-1, 0, -21], [-1.9, 0, -21]).rail(W, [-3.4, 0, -21], [-9, 0, -21], [-9, 0, -29], [9, 0, -29], [9, 0, -21]);
  return t.tee(0, 0, 0.5).cup(-1.5, 0, -25.5);
};
