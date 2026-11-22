import { hole, V } from '../lib.mjs';

// L'Archipel: islands linked by cannons, the sequel of Tir Groupé. On every island the balls
// drop in the sand at the same spot, between two cannons that fire at two different islands: the
// choice is a putt 2 u to the left or 2 u to the right. From the tee, the two medium islands; from
// them, the big island in the middle (safe), the coin islet in the west or the tiny islet in the
// east; and the green, its cup in a square of grass ringed with sand. The big island's cannon
// drops at the green's entrance, the coin islet's on the far side of the ring; the tiny islet's,
// in the ring, a step from the cup.

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
  const t = hole("L'Archipel", { theme: 'quai', par: 4, maxStrokes: 10 });
  const wy = -0.3, H = 0.45, G = 18;
  const plat = [];
  const floor = (x0, z0, x1, z1, m) => { t.floor(x0, z0, x1, z1, 0, m); plat.push([x0, z0, x1, z1]); };
  // an island of sand of half-sizes (a, b) around (x, z), a checkpoint band across it at zb (half
  // as wide as ba)
  // a tall one, so that a ball dropping through it takes it
  const island = (x, z, a, b, zb, at, ba = a) => {
    floor(x - a, z - b, x + a, z + b, 'sand');
    t.zone('checkpoint', { shape: 0, c: V(x, 1.5, zb), h: V(ba, 1.5, 0.4), params: { at: [at[0], 0, at[1]] } });
  };
  // a cannon at (x, z) that drops the ball at (tx, tz), the same height, with a vertical speed vy
  const cannon = (x, z, [tx, tz], vy = 14, r = 0.5) => {
    const T = 2 * vy / G;
    t.disc('launcher', x, z, r, 0, { v: V((tx - x) / T, vy, (tz - z) / T) });
  };
  // where each cannon drops its balls (measured: they slide on 0.3 to 1.2 u in the sand)
  const A = {
    ml: [-5, -9.5], mr: [5, -9.5], // from the tee
    coin: [-9.5, -19], bigW: [0, -20], bigE: [0, -20], tiny: [9.5, -19], // from the medium islands
    coinG: [-3, -34.2], bigG: [-2.2, -27.6], tinyG: [2.2, -32.5], // to the green: off the cup's line
  };
  // the tee island, walled, a cannon on each side
  floor(-4.5, -2.5, 4.5, 2.5);
  t.fence(-4.5, -2.5, 4.5, 2.5);
  cannon(-2.5, -1.2, A.ml);
  cannon(2.5, -1.2, A.mr);
  // the medium islands (5 x 5): the balls rest at their middle, a cannon 2 u on each side
  island(-5, -10, 2.5, 2.5, -9, [-5, -11.5], 1.4);
  island(5, -10, 2.5, 2.5, -9, [5, -11.5], 1.4);
  cannon(-7, -10, A.coin);
  cannon(-3, -10, A.bigW);
  cannon(3, -10, A.bigE);
  cannon(7, -10, A.tiny);
  // the coin islet (3 x 3, the coin where the balls drop), the big island (7 x 7), the tiny islet
  island(-9.5, -19.5, 1.5, 1.5, -19.2, [-10.2, -20.5]);
  t.disc('strokes', -9.5, -19.9, 0.5, 0, { add: -1 }, { once: true });
  cannon(-8.4, -20.9, A.coinG, 14, 0.4);
  island(0, -20, 3.5, 3.5, -20.6, [0, -22.5]);
  cannon(0, -19, A.bigG, 16);
  island(9.5, -19.5, 1.25, 1.5, -19.2, [9.9, -20.5]);
  cannon(8.8, -20.5, A.tinyG, 16, 0.35);
  // the green: a grass apron, then sand all round the 3 x 3 grass square of the cup; walled
  const gz = -33;
  floor(-4, -29, 4, -27);
  floor(-1.5, gz - 1.5, 1.5, gz + 1.5);
  floor(-4, gz + 1.5, 4, -29, 'sand');
  floor(-4, -37, 4, gz - 1.5, 'sand');
  floor(-4, gz - 1.5, -1.5, gz + 1.5, 'sand');
  floor(1.5, gz - 1.5, 4, gz + 1.5, 'sand');
  t.fence(-4, -27, 4, -37);
  waterAround(t, [-13, 2.5, 13, -37], plat, wy);
  return t.tee(0, 0, 1).cup(0, 0, gz);
};
