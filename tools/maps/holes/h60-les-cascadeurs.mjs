import { hole } from '../lib.mjs';

// Les Cascadeurs: three stunt jumps over water. A wide speedpad sets the speed, a ramp does the
// rest: every jump has the same length, and keeps the place across the pad the ball crossed it at.
// The landings shrink. The first takes anything off the pad and stops it against a low wall; the
// second jump starts from a run-up beside it, and its landing, 2.5 wide, lies on the right of the
// jump: line up before the pad. The second landing ends on a low wall with a gap, the third pad
// behind it: land in line with the gap, and the second and third jumps chain. The third, faster,
// clears 5 u of water onto a 1.5 wide neck, and the green.

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
  const t = hole('Les Cascadeurs', { theme: 'quai', par: 4, maxStrokes: 10 });
  const wy = -0.3, A = 15 * Math.PI / 180, RL = 2.2; // water level, ramp angle and length
  const rh = RL * Math.sin(A), rd = RL * Math.cos(A); // ramp height and depth
  const H = 0.45;
  const plat = []; // the floors over the water, for the water around them
  const floor = (x0, z0, x1, z1) => { t.floor(x0, z0, x1, z1); plat.push([x0, z0, x1, z1]); };
  // jump: a speedpad from z to z - 0.8 and a ramp after it, from x0 to x1; returns the ramp's end.
  // Measured: at 12 the ball lands 3.8 past the ramp, at 14, 5.9.
  const jump = (x0, x1, z, speed) => {
    floor(x0, z - 0.8, x1, z);
    t.pad('speedpad', x0, z - 0.8, x1, z, 0, { dir: [0, 0, -1], speed });
    t.slab([(x0 + x1) / 2, 0, z - 0.8], [(x0 + x1) / 2, rh, z - 0.8 - rd], x1 - x0);
    plat.push([x0, z - 0.8 - rd, x1, z - 0.8]);
    return z - 0.8 - rd;
  };
  // tall checkpoint band across x0..x1 at z: a ball flying over it takes it too
  const check = (x0, x1, z, at) => t.zone('checkpoint', { shape: 0, c: [(x0 + x1) / 2, 1.5, z - 0.4], h: [(x1 - x0) / 2, 1.5, 0.4], params: { at } });
  // the start, and the first jump (12): 3 u of water
  floor(-2, -3, 2, 2);
  t.rail(1.2, [-2, 0, -3.8], [-2, 0, 2], [2, 0, 2], [2, 0, -3.8]);
  const L1 = jump(-2, 2, -3, 12) - 3;
  // the first landing: the arrival lane (x -2..2) ends on a low wall; on its right the run-up of
  // the second jump (x 2.1..6.5), its pad reached from behind only
  floor(-2, L1 - 7, 2.1, L1);
  floor(2.1, L1 - 6.2, 6.5, L1); // the run-up stops at the pad, which has its own floor
  t.rail(H, [-2, 0, L1 - 7], [2.1, 0, L1 - 7], [2.1, 0, L1 - 5.4]);
  check(-2, 6.5, L1 - 1.6, [0, 0, L1 - 4]);
  const L2 = jump(2.1, 6.5, L1 - 6.2, 12) - 3;
  // the second landing, 2.5 wide on the right; its end wall leaves a gap, the third pad behind it
  const xg = 5.5; // the gap: 1 wide, the right end of the wall
  floor(4, L2 - 8, 6.5, L2);
  t.rail(H, [4, 0, L2 - 8], [xg, 0, L2 - 8]);
  check(4, 6.5, L2 - 1.6, [5.25, 0, L2 - 4.5]);
  const L3 = jump(xg, 6.5, L2 - 8, 14) - 5;
  // the third landing, a neck in line with the gap, and the green
  const g0 = L3 - 3, g1 = L3 - 10;
  floor(5, g0, 6.5, L3); // 1.5 wide
  floor(0, g1, 7, g0);
  t.rail(H, [5, 0, g0], [0, 0, g0], [0, 0, g1], [7, 0, g1], [7, 0, g0], [6.5, 0, g0]);
  check(0.15, 6.85, g0 - 0.2, [3.5, 0, g0 - 2]);
  waterAround(t, [-6, -3.8, 11, g1], plat, wy); // the start and the green are walled
  return t.tee(0, 0, 0).cup(2, 0, g0 - 3.5);
};
