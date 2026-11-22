import { hole, V } from '../lib.mjs';

// Les Geysers: a causeway 3 wide over the water, in an L, dotted with small round jumppads: touch
// one and the ball leaps 4 or 5 u further on, wanted or not. First straight north, three geysers on
// its edges: down the middle, or off one of them, and the leap lands on the causeway again (or,
// aimed across the water, on the second leg: the risky cut over the elbow). At the elbow a geyser
// right in the line of the first leg throws whoever touches it into the water. Last,
// the second leg is cut: 3 u of water, and a geyser at its edge that one has to take.

// waterAround fills the box (x0, z0)-(x1, z1) with water, but under the rectangles of rs. The box
// is cut along every edge of rs into cells; the floor is laid in columns, and the hazards are
// grown as large as they go (they may overlap), so that each one has a part a ball can reach.
const waterAround = (t, [bx0, bz0, bx1, bz1], rs, y) => {
  const q = v => Math.round(v * 1e4) / 1e4;
  const cuts = (a, b, k) => [...new Set([a, b, ...rs.flatMap(r => [r[k], r[k + 2]])].map(q))].filter(v => v >= Math.min(a, b) && v <= Math.max(a, b)).sort((u, w) => u - w);
  const xs = cuts(bx0, bx1, 0), zs = cuts(bz0, bz1, 1), nx = xs.length - 1, nz = zs.length - 1;
  const inside = (x, z) => rs.some(r => x > Math.min(r[0], r[2]) && x < Math.max(r[0], r[2]) && z > Math.min(r[1], r[3]) && z < Math.max(r[1], r[3]));
  const free = [...Array(nx)].map((_, i) => [...Array(nz)].map((_, j) => !inside((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2)));
  for (let i = 0; i < nx; i++) // the floor, a column at a time
    for (let j = 0; j < nz; j++) {
      if (!free[i][j] || (j > 0 && free[i][j - 1])) continue;
      let k = j; while (k + 1 < nz && free[i][k + 1]) k++;
      t.floor(xs[i], zs[j], xs[i + 1], zs[k + 1], y);
    }
  const done = free.map(c => c.map(() => false)), box = (i0, i1, j0, j1) => { for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (!free[i][j]) return false; return true; };
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      if (!free[i][j] || done[i][j]) continue;
      // the largest of the rectangles grown from this cell along x first, or along z first
      const grow = xFirst => {
        let i0 = i, i1 = i, j0 = j, j1 = j;
        for (const ax of xFirst ? [0, 1] : [1, 0]) {
          if (ax === 0) { while (i0 > 0 && box(i0 - 1, i0 - 1, j0, j1)) i0--; while (i1 + 1 < nx && box(i1 + 1, i1 + 1, j0, j1)) i1++; }
          else { while (j0 > 0 && box(i0, i1, j0 - 1, j0 - 1)) j0--; while (j1 + 1 < nz && box(i0, i1, j1 + 1, j1 + 1)) j1++; }
        }
        return [i0, i1, j0, j1, (xs[i1 + 1] - xs[i0]) * (zs[j1 + 1] - zs[j0])];
      };
      const a = grow(true), b = grow(false), [i0, i1, j0, j1] = a[4] >= b[4] ? a : b;
      for (let u = i0; u <= i1; u++) for (let v = j0; v <= j1; v++) done[u][v] = true;
      const x0 = xs[i0], x1 = xs[i1 + 1], z0 = zs[j0], z1 = zs[j1 + 1];
      t.zone('hazard', { shape: 0, c: [q((x0 + x1) / 2), y + 0.15, q((z0 + z1) / 2)], h: [q((x1 - x0) / 2), 0.15, q(Math.abs(z1 - z0) / 2)] });
    }
};

export default () => {
  const t = hole('Les Geysers', { theme: 'canyon', par: 4, maxStrokes: 10 });
  const wy = -0.3, H = 0.45;
  const plat = [];
  const floor = (x0, z0, x1, z1) => { t.floor(x0, z0, x1, z1); plat.push([x0, z0, x1, z1]); };
  // geyser: a round jumppad, taller than its leap (1.36), so a ball falling back on it does not
  // enter it again
  const geyser = (x, z, r = 0.5) => t.zone('jumppad', { shape: 1, c: V(x, 1, z), r, hh: 1, params: { speed: 7 } });
  // leg A, north from the tee: three geysers on its edges
  floor(-1.5, -13, 1.5, 2);
  t.rail(H, [-1.5, 0, 2], [1.5, 0, 2]);
  geyser(-1, -4);
  geyser(1, -7);
  geyser(-1, -10);
  // the elbow and leg B, west along z -13..-16 to the cut; a kerb on the far side of leg B keeps
  // the balls that come across the water from leg A
  const xc = -12; // the cut
  floor(xc, -16, 1.5, -13);
  t.rail(H, [xc, 0, -16], [-1.5, 0, -16]);
  geyser(0, -12.6); // in the line of leg A, where the kerb stops: straight into the water
  t.pad('checkpoint', -6.5, -16, -5.7, -13, 0, { at: [-7.5, 0, -14.5] });
  // the cut: 3 u of water, the geyser at its edge, and the green beyond (walled but in front)
  geyser(xc + 0.6, -14.5, 0.6);
  const g0 = xc - 3, g1 = g0 - 6;
  floor(g1, -17.5, g0, -11.5);
  t.rail(H, [g0, 0, -11.5], [g1, 0, -11.5], [g1, 0, -17.5], [g0, 0, -17.5]);
  t.zone('checkpoint', { shape: 0, c: [g0 - 0.6, 1.5, -14.5], h: [0.4, 1.5, 3], params: { at: [g0 - 2, 0, -14.5] } }); // tall: a leap over it takes it
  waterAround(t, [g1, 2, 5, -20], plat, wy);
  return t.tee(0, 0, 0).cup(g0 - 3.5, 0, -16);
};
