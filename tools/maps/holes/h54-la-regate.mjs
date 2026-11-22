import { hole } from '../lib.mjs';

// La Régate: a frozen lake and a steady west wind (1.5 u/s², blowing east). On the ice it carries
// everything away; on grass it moves nothing at rest. Two buoys to round, a key on each: the blue
// one upwind (west), the vermilion one downwind (east). The finish port, walled, juts into the
// lake from the north shore; its mouth has two gates, one behind the other. Grass shores all round
// stop the boats; an islet in the middle is a place to stop too.
export default () => {
  const t = hole('La Régate', { theme: 'banquise', par: 4, maxStrokes: 10 });
  const L = 10, S = 1.5, z0 = -4, z1 = -24; // the lake's half-width, the shores, its south and north edges
  t.floor(-L - S, z1 - S, L + S, z1).floor(-L - S, z1, -L, z0).floor(L, z1, L + S, z0); // north, west, east shores
  t.floor(-L - S, z0, L + S, 0); // the south shore: the start port
  t.fence(-L - S, z1 - S, L + S, 0, 0, 0.6);
  // the islet: 2 x 2 of grass, west of the middle
  const ix = -3.5, iz = -12.5;
  t.floor(ix - 1, iz - 1, ix + 1, iz + 1);
  // the finish port, 6 x 6, jutting into the lake; its mouth (4 u) has two gates
  const px = 3, pz = -18;
  // the lake, tiled round the islet and the port
  t.floor(-L, iz + 1, L, z0, 0, 'ice').floor(-L, pz, L, iz - 1, 0, 'ice').floor(-L, iz - 1, ix - 1, iz + 1, 0, 'ice').floor(ix + 1, iz - 1, L, iz + 1, 0, 'ice');
  t.floor(-L, z1, -px, pz, 0, 'ice').floor(px, z1, L, pz, 0, 'ice');
  t.floor(-px, z1, px, pz);
  t.rail(0.6, [-2, 0, pz], [-px, 0, pz], [-px, 0, z1 - S]).rail(0.6, [2, 0, pz], [px, 0, pz], [px, 0, z1 - S]);
  t.block(-2, pz + 0.15, 2, pz - 0.15, -0.15, 0.6, { key: 1 }); // the blue gate
  t.block(-2, pz - 0.65, 2, pz - 0.95, -0.15, 0.6, { key: 2 }); // the vermilion gate, behind it
  t.rail(0.6, [-2, 0, pz], [-2, 0, pz - 1.1]).rail(0.6, [2, 0, pz], [2, 0, pz - 1.1]); // the gates' frame
  // the wind, over the ice only (not over the port): a fan's wind, 1.2 high
  const wind = (x0, za, x1, zb) => t.zone('wind', { shape: 0, c: [(x0 + x1) / 2, 0.6, (za + zb) / 2], h: [(x1 - x0) / 2, 0.6, Math.abs(zb - za) / 2], params: { accel: [1.5, 0, 0] } });
  wind(-L, z0, L, pz); wind(-L, pz, -px - 0.15, z1); wind(px + 0.15, pz, L, z1);
  // the buoys and their keys
  const buoy = (x, z, key) => t.post(x, z, 0, 0.4).disc('key', x, z, 1.4, 0, { key }, { once: true });
  buoy(-6.5, -9, 1); // west, upwind: the blue key
  buoy(6, -14, 2); // east, downwind: the vermilion key
  return t.tee(0, 0, -2).cup(0, 0, -21.5);
};
