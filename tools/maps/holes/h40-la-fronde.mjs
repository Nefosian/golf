import { hole } from '../lib.mjs';

// La Fronde: "planets" (a strong magnet over a small sand patch) bend a passing ball around the end
// of a wall, or capture it. Two walls make an S; the cup sits in the field of the last planet.
const S = 0.7, R = 4.5, PULL = 11; // sand patch half-size, magnet radius and pull (11: sand holds a ball still)

// grass covers the rectangle but for the given square holes, cut along every hole edge.
function grassAround(t, x0, z0, x1, z1, holes) {
  const xs = [...new Set([x0, x1, ...holes.flatMap(([x, z]) => [x - S, x + S])])].sort((a, b) => a - b);
  const zs = [...new Set([z0, z1, ...holes.flatMap(([x, z]) => [z - S, z + S])])].sort((a, b) => a - b);
  for (let j = 0; j + 1 < zs.length; j++) {
    let run = null; // merge the cells of a row into runs
    for (let i = 0; i + 1 <= xs.length; i++) {
      const inHole = i + 1 < xs.length && holes.some(([x, z]) => xs[i] >= x - S && xs[i + 1] <= x + S && zs[j] >= z - S && zs[j + 1] <= z + S);
      if (i + 1 < xs.length && !inHole) { run ??= xs[i]; continue; }
      if (run !== null) t.floor(run, zs[j], xs[i], zs[j + 1]);
      run = null;
    }
  }
}

export default () => {
  const t = hole('La Fronde', { theme: 'nuit', par: 4 });
  const X = 8, Z0 = 3, Z1 = -33; // the plateau
  const planets = [[-1, -13], [1, -24]];
  grassAround(t, -X, Z1, X, Z0, planets);
  for (const [x, z] of planets) {
    t.floor(x - S, z - S, x + S, z + S, 0, 'sand');
    t.disc('magnet', x, z, R, 0, { at: [x, 0, z], accel: PULL });
  }
  t.fence(-X, Z0, X, Z1);
  t.rail(0.45, [-3.5, 0, -10], [X, 0, -10]); // first wall: the gap is west
  t.rail(0.45, [-X, 0, -21], [3.5, 0, -21]); // second wall: the gap is east
  return t.tee(3, 0, 0).cup(-3.5, 0, -28);
};
