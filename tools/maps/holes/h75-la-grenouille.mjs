import { hole, V } from '../lib.mjs';

// La Grenouille: the table game. A 10° board, pierced with five holes, rises beyond a climb from
// the tee; under it each hole has its chute. The two big holes low on the board drop the ball into
// gutters that roll it back to the tee; the two middle-sized ones near the top lead out to the
// side lawns, behind low walls; the frog's mouth (1 u, top middle) leads into the cup's enclosure.
// A ball that falls in no hole rolls back down, over the big holes again.
export default () => {
  const t = hole('La Grenouille', { theme: 'quai', par: 3 });
  const H = 0.45, X = 6, XO = 8; // wall height, half-width of the board, of the apron
  const k = Math.tan(10 * Math.PI / 180), Y0 = 1.5, b0 = -1, b1 = -11; // the board: slope, foot height, foot, top edge
  const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  const ry = z => (z >= b0 ? Y0 * (3 - z) / (3 - b0) : Y0 + (b0 - z) * k); // the climb's and the board's surface
  const T = 0.2; // the board's thickness: thin, so that the chutes fit under it
  const YN = 0.5; // the lawns and the enclosure, north of the board, below its top edge
  // a piece of the board between x0..x1 and z0..z1 (z0 > z1)
  const plank = (x0, x1, z0, z1) => {
    const ph = Math.atan(k), l = (z0 - z1) / Math.cos(ph), up = [0, Math.cos(ph), Math.sin(ph)];
    const mid = [(x0 + x1) / 2, (ry(z0) + ry(z1)) / 2, (z0 + z1) / 2];
    t.raw({ shape: 0, kind: 0, c: V(mid[0] - up[0] * T / 2, mid[1] - up[1] * T / 2, mid[2] - up[2] * T / 2), rot: V(0, Math.PI / 2, ph), h: V(l / 2, T / 2, (x1 - x0) / 2) });
  };
  // a wall of a chute, along its floor from a to b: under the board it reaches the board's underside
  // (a falling ball cannot hop over it), in 0.25 u pieces since the gap grows along the chute
  const chuteWall = (a, b) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.25);
    for (let i = 0; i < n; i++) {
      const p = lerp(a, b, i / n), q = lerp(a, b, (i + 1) / n);
      const lo = Math.min(p[2], q[2]), under = Math.abs(q[0]) < X && lo > b1 ? ry(lo) - T : -Infinity;
      t.rail(Math.max(0.4, under - Math.min(p[1], q[1]) + 0.05), p, q);
    }
  };
  // the holes: [x center, z center, half size]: two big ones low, two middle-sized ones high, the mouth
  const zb = -3.5, zm = -8, zg = -9.5, xb = 4, xm = 2.5, xe = 4.5; // xe: where a middle chute comes out
  const holes = [[-xb, zb, 1], [xb, zb, 1], [-xm, zm, 0.75], [xm, zm, 0.75], [0, zg, 0.5]];
  // the board, cut in bands along z at the holes' edges, and each band around its holes
  const cuts = [...new Set([b0, b1, ...holes.flatMap(([, z, r]) => [z + r, z - r])])].sort((a, b) => b - a);
  for (let i = 0; i + 1 < cuts.length; i++) {
    const z0 = cuts[i], z1 = cuts[i + 1], zc = (z0 + z1) / 2;
    const gaps = holes.filter(([, z, r]) => Math.abs(zc - z) < r).map(([x, , r]) => [x - r, x + r]).sort((a, b) => a[0] - b[0]);
    let x = -X;
    for (const [g0, g1] of gaps) { plank(x, g0, z0, z1); x = g1; }
    plank(x, X, z0, z1);
  }
  // the apron, the climb to the board's foot (21°), strips beside it where the gutters end
  t.floor(-XO, 3, XO, 7.5).slab([0, 0, 3], [0, Y0, b0], 2 * X);
  t.floor(-XO, -1, -X, 3).floor(X, -1, XO, 3);
  t.rail(H, [-XO, 0, 7.5], [XO, 0, 7.5]);
  for (const s of [-1, 1]) {
    // the side walls of the climb and the board
    t.rail(H, [s * X, 0, 3], [s * X, Y0, b0], [s * X, ry(b1), b1]);
    // a big hole's chute: under the board, out sideways (8°) into a gutter that rolls south (8°)
    // to the strip beside the climb
    const ci = s * (xb - 1.1), co = s * 6.2, cy0 = 1.15, cy1 = 0.56, gy = 0.5, gz = zb - 1.2;
    t.slab([s * (xb - 1), cy0, zb], [co, cy1, zb], 2.4);
    t.rail(0.4, [ci, cy0, zb + 1.2], [ci, cy0, gz]);
    chuteWall([ci, cy0, zb + 1.2], [co, cy1, zb + 1.2]); chuteWall([ci, cy0, gz], [co, cy1, gz]);
    t.slab([s * 7.1, gy, gz], [s * 7.1, 0, -1], 1.8);
    t.rail(H, [s * XO, 0, 7.5], [s * XO, 0, -1], [s * XO, gy, gz], [co - s * 0.1, gy, gz]);
    t.rail(H, [s * 6.1, 0, -1], [s * 6.1, gy * (zb + 1.2 + 1) / (gz + 1), zb + 1.2]);
    // a middle-sized hole's chute: north (straight under the hole, so that its walls stay hidden
    // under the board), then a little outwards (10°), out under the board's top edge onto a lawn
    const m0 = [s * xm, 1.95, zm + 0.9], mk = [s * xm, 1.95 - 0.18 * 2.6, zm - 1.7], m1 = [s * xe, YN, -14];
    t.slab(m0, mk, 1.9).slab(mk, m1, 1.9);
    t.rail(0.4, [m0[0] - 0.95, m0[1], m0[2]], [m0[0] + 0.95, m0[1], m0[2]]);
    for (const e of [-0.95, 0.95]) { chuteWall(...[m0, mk].map(([x, y, z]) => [x + e, y, z])); chuteWall(...[mk, lerp(mk, m1, 0.85)].map(([x, y, z]) => [x + e, y, z])); }
  }
  // the mouth's chute: straight north (19°) into the enclosure; the cup is beside its line
  const g0 = [0, 2.25, zg + 0.7], g1 = [0, YN, -14.5];
  t.slab(g0, g1, 1.2);
  t.rail(0.35, [-0.6, g0[1], g0[2]], [0.6, g0[1], g0[2]]);
  for (const e of [-0.6, 0.6]) chuteWall(...[g0, lerp(g0, g1, 0.85)].map(([x, y, z]) => [x + e, y, z]));
  // the board's top edge: a wall on it, and a wall under it from the ground of the north side to
  // the board, open where the three chutes come out
  t.rail(0.6, [-X, ry(b1), b1], [X, ry(b1), b1]);
  const under = ry(b1) - T, wz0 = b1, wz1 = b1 - 0.3;
  let x = -X;
  const xw = xm + (xe - xm) * (zm - 1.7 - b1 + 0.15) / (zm - 1.7 + 14); // the middle chutes' x at the wall
  for (const [g0, g1] of [[-xw - 1.3, -xw + 1.3], [-0.75, 0.75], [xw - 1.3, xw + 1.3]]) { t.block(x, wz1, g0, wz0, YN - 0.3, under); x = g1; }
  t.block(x, wz1, X, wz0, YN - 0.3, under);
  // the north side: lawns, and the cup's enclosure between two low walls; round their north ends
  const nz = -19.5, mz = -16, mw = 2.8;
  t.floor(-XO, nz, XO, wz1, YN);
  t.rail(H, [-X, YN, wz1], [-XO, YN, wz1], [-XO, YN, nz], [XO, YN, nz], [XO, YN, wz1], [X, YN, wz1]);
  t.rail(H, [-mw, YN, wz1], [-mw, YN, mz]).rail(H, [mw, YN, wz1], [mw, YN, mz]);
  return t.tee(0, 0, 5.5).cup(1.3, YN, -14.8);
};
