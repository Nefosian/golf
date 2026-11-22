import { hole } from '../lib.mjs';

// Le Siphon: a magnet swallows every ball that gets into the funnel around the cup; two gates of
// repulsors guard the way to its mouth.
export default () => {
  const t = hole('Le Siphon', { theme: 'nuit', par: 3 });
  const X = 8, zf = -35, cz = -29; // half-width of the plateau, its far end, the cup
  t.floor(-X, zf, X, 2).fence(-X, zf, X, 2);
  // a repulsor, a post at its heart: a ball aimed at its center bounces instead of crossing it.
  const rep = (x, z, r) => { t.disc('magnet', x, z, r, 0, { at: [x, 0, z], accel: -8 }); t.post(x, z, 0, 0.45); };
  // gate 1: two repulsors and a calm corridor of 1.5 between them; the edges go round.
  rep(-2.55, -8, 1.8); rep(2.55, -8, 1.8);
  // gate 2: three repulsors in a row, two corridors of 1.2, offset from the first.
  rep(-4.2, -17, 1.5); rep(0, -17, 1.5); rep(4.2, -17, 1.5);
  // the siphon: a round wall of radius R around the cup, open over 110° towards the tee,
  // and a magnet inside that pulls every ball that comes in round and round into the cup.
  const R = 4.5, m = 55 * Math.PI / 180, n = 16, pts = [];
  for (let i = 0; i <= n; i++) { const a = m + (2 * Math.PI - 2 * m) * i / n; pts.push([R * Math.sin(a), 0, cz + R * Math.cos(a)]); }
  t.rail(0.45, ...pts);
  t.disc('magnet', 0, cz, 3.5, 0, { at: [0, 0, cz], accel: 5 });
  return t.tee(0, 0, 0).cup(0, 0, cz);
};
