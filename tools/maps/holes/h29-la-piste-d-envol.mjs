import { hole, V } from '../lib.mjs';

// La Piste d'Envol: conveyor belts that end on ramps. A ball is putted onto a belt from the lawn
// beside it: the earlier it boards, the faster it takes off and the farther it lands. The short
// belt jumps a sand ditch; the long one jumps the water, to a sand islet (board late) or
// straight to the green (board at the right metre).
export default () => {
  const t = hole("La Piste d'Envol", { theme: 'quai', par: 4, maxStrokes: 10 });
  const A = 12, rl = 3, ang = 15 * Math.PI / 180; // the push of the belts, the length and slope of a ramp
  const ramp = (x0, x1, z) => t.slab([(x0 + x1) / 2, 0, z], [(x0 + x1) / 2, rl * Math.sin(ang), z - rl * Math.cos(ang)], x1 - x0);
  const belt = (x0, z0, x1, z1) => t.pad('wind', x0, z0, x1, z1, 0, { accel: [0, 0, -A] });
  const X0 = -8, X1 = 10; // the course
  // the tee lawn and the short belt (6 u), its ramp over the ditch; a wall leaves it the only way on
  const sb = [5.5, 8.5]; // far from the long belt: a ball landing beside the ditch does not roll onto it
  t.floor(X0, -7, X1, 1.5);
  belt(sb[0], -1, sb[1], -7);
  ramp(sb[0], sb[1], -7);
  t.rail(0.45, [sb[0], 0, -7], [X0, 0, -7], [X0, 0, 1.5], [X1, 0, 1.5], [X1, 0, -7], [sb[1], 0, -7]);
  // the sand ditch (3 u past the ramp), then the long belt (14 u) between two lawns, its ramp over the water
  const lb = [-3.5, -0.5], lx = (lb[0] + lb[1]) / 2;
  t.floor(X0, -13, X1, -7, 0, 'sand');
  t.floor(X0, -27, X1, -13);
  belt(lb[0], -13, lb[1], -27);
  ramp(lb[0], lb[1], -27);
  t.rail(0.45, [lb[0], 0, -27], [X0, 0, -27], [X0, 0, -7]);
  t.rail(0.45, [lb[1], 0, -27], [X1, 0, -27]).rail(1, [X1, 0, -27], [X1, 0, -7]); // tall beside the short ramp
  // over the water: the sand islet (from 1.2 to 5 past the top of the ramp), a plank, the green
  const top = -27 - rl * Math.cos(ang);
  const isl = [lx - 2, top - 5, lx + 2, top - 1.2], gr = [lx - 3.5, top - 14, lx + 4, top - 7];
  t.floor(isl[0], isl[1], isl[2], isl[3], 0, 'sand');
  t.floor(lx - 1, gr[3], lx + 1, isl[1]); // the plank
  t.floor(gr[0], gr[1], gr[2], gr[3]);
  t.floor(gr[0], gr[1] - 1.5, gr[2], gr[1], 0, 'sand'); // the back of the green: a long flight stops there
  t.rail(1.5, [gr[0], 0, gr[1] - 1.5], [gr[2], 0, gr[1] - 1.5]);
  lake(t, X0, gr[1] - 1.5, X1, -27, [[isl[0], isl[1], isl[2], isl[3]], [lx - 1, isl[1], lx + 1, gr[3]], [gr[0], gr[1] - 1.5, gr[2], gr[3]]]);
  // checkpoints, tall bands across the front of the islet and of the green: a ball landing takes it
  const band = (x0, x1, z, at) => t.zone('checkpoint', { shape: 0, c: V((x0 + x1) / 2, 1.5, z - 0.25), h: V((x1 - x0) / 2, 1.5, 0.25), params: { at } });
  band(isl[0], isl[2], isl[3], [lx, 0, (isl[1] + isl[3]) / 2]);
  band(gr[0], gr[2], gr[3], [lx - 1.5, 0, gr[3] - 1.5]);
  return t.tee(2.5, 0, -1).cup(lx + 2.5, 0, (gr[1] + gr[3]) / 2); // off the line of the belt
};

// lake fills the rectangle (x0, z0)-(x1, z1) with water, but under the lands ([x0, z0, x1, z1] each).
function lake(t, x0, z0, x1, z1, lands) {
  const xs = [...new Set([x0, x1, ...lands.flatMap(l => [l[0], l[2]])])].filter(x => x >= x0 && x <= x1).sort((a, b) => a - b);
  const zs = [...new Set([z0, z1, ...lands.flatMap(l => [l[1], l[3]])])].filter(z => z >= z0 && z <= z1).sort((a, b) => a - b);
  const dry = (x, z) => lands.some(l => x > l[0] && x < l[2] && z > l[1] && z < l[3]);
  for (let j = 0; j + 1 < zs.length; j++) {
    const zm = (zs[j] + zs[j + 1]) / 2;
    for (let i = 0; i + 1 < xs.length; i++) {
      if (dry((xs[i] + xs[i + 1]) / 2, zm)) continue;
      let k = i + 1;
      while (k + 1 < xs.length && !dry((xs[k] + xs[k + 1]) / 2, zm)) k++;
      t.water(xs[i], zs[j], xs[k], zs[j + 1]);
      i = k - 1;
    }
  }
  return t;
}
