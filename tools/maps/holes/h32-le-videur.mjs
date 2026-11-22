import { hole } from '../lib.mjs';

// Le Videur: the cup waits on an island, behind a big round bumper (the bouncer) that throws any
// ball touching it 12 u away, into the water if it is unlucky. Before it: a small bumper on the
// tee lawn (no water there), then a bridge with a bumper against its west rail.
export default () => {
  const t = hole('Le Videur', { theme: 'nuit', par: 4, maxStrokes: 10 });
  const lands = [[-5, -7, 5, 1.5], [-2, -17, 1, -7], [-5, -27, 5, -17]]; // lawn, bridge, island
  t.floor(-5, -7, 5, 1.5); // the lawn
  t.floor(-2, -8.5, 1, -7, 0, 'sand').floor(-2, -15.5, 1, -8.5).floor(-2, -17, 1, -15.5, 0, 'sand'); // the bridge
  t.floor(-5, -27, 5, -17); // the island
  lake(t, -7, -17, 7, -7, lands).water(-7, -27, -5, -17); // walls close the island north and east
  t.rail(0.45, [-2, 0, -7], [-5, 0, -7], [-5, 0, 1.5], [5, 0, 1.5], [5, 0, -7], [1, 0, -7]); // the lawn: water only at the bridge
  t.rail(0.45, [-2, 0, -7], [-2, 0, -17]); // the west rail of the bridge
  t.rail(0.45, [-5, 0, -27], [5, 0, -27], [5, 0, -17]); // the island: walls north and east
  t.post(0.6, -3.5, 0, 0.6, 0.45, 'bumper'); // the doorman, on the line from the tee to the bridge
  t.post(-1.35, -12, 0, 0.5, 0.45, 'bumper'); // against the west rail: 2 u to pass, water east
  t.post(1.4, -23.4, 0, 1, 0.45, 'bumper'); // the bouncer, in front of the cup
  t.pad('checkpoint', -2, -17.1, 1, -17.7, 0, { at: [-0.5, 0, -18.5] }); // entering the island
  return t.tee(2.5, 0, 0).cup(3, 0, -25);
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
