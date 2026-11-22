import { hole } from '../lib.mjs';

// Le Chasse-Neige: three snow ploughs cross the corridor, each in its lane, out of a slot in one
// wall and back. They are fast: a ball resting or rolling in a lane when one comes is knocked
// across, into the sand niche on the far side (a ball that lands there stays), and loses a
// stroke getting out; it is never carried along. Cross between two passes. The first lane is the
// slowest; the last is just below the exit, a side door that leads to the green.
export default () => {
  const t = hole('Le Chasse-Neige', { theme: 'banquise', par: 4 });
  const X = 4, IN = X - 0.15, H = 0.45, D = 2; // half-width, inner face of the side walls, wall height, niche depth
  const back = -30, e0 = -24.5, e1 = -28; // the corridor's end; the exit door in the east wall
  const px = 11, gx0 = 5, gz = e1 - 6; // the passage east of the door, to x = px; the green north of it, from x = gx0 to px, to z = gz
  t.floor(-X, back, X, 2);
  // the lanes: [z of the south edge, depth, side the plough parks on (it knocks balls to the
  // other), period, phase]
  const lanes = [[-8, 2.5, 1, 2.6, 0], [-14, 2.5, -1, 2.2, 0.25], [-19.5, 2.5, 1, 2.4, 0.5]];
  const gaps = { [-1]: [], [1]: [] }; // the openings in each side wall: [z0, z1]
  for (const [z0, l, s, period, phase] of lanes) {
    const z1 = z0 - l;
    // the sand niche the plough knocks balls into, on the side opposite its slot
    t.floor(s > 0 ? -X - D : X, z1, s > 0 ? -X : X + D, z0, 0, 'sand');
    gaps[-s].push([z0, z1, 'niche']);
    gaps[s].push([z0, z1, 'slot']);
    // the plough: it fills the lane (0.05 off the slot's edges) and is long enough to fill its
    // slot at the end of its run, 0.35 into the niche
    const run = IN + X + 0.35, len = run + 0.6;
    const x0 = s > 0 ? IN : -IN - len, x1 = s > 0 ? IN + len : -IN;
    t.block(x0, z1 + 0.05, x1, z0 - 0.05, -0.05, 0.6, { motion: { period, move: [-s * run, 0, 0], pivot: [0, 0, 0], axis: [0, 0, 0], ...(phase ? { phase } : {}) } });
  }
  // the side walls, open at the slots and round the niches (the east one also at the exit)
  for (const s of [-1, 1]) {
    const pts = [[s * X, 0, 2]];
    const walls = [];
    for (const [z0, z1, kind] of gaps[s]) {
      if (kind === 'niche') pts.push([s * X, 0, z0], [s * (X + D), 0, z0], [s * (X + D), 0, z1], [s * X, 0, z1]);
      else { walls.push(pts.splice(0), [s * X, 0, z0]); pts.push([s * X, 0, z1]); }
    }
    for (let i = 0; i < walls.length; i += 2) t.rail(H, ...walls[i], walls[i + 1]);
    if (s > 0) { t.rail(H, ...pts, [X, 0, e0]); t.rail(H, [X, 0, e1], [X, 0, back]); } else t.rail(H, ...pts, [-X, 0, back]);
  }
  t.rail(H, [-X, 0, 2], [X, 0, 2]).rail(H, [-X, 0, back], [X, 0, back]);
  // the exit: a passage east, then the green turns north, out of sight of the corridor
  t.floor(X, e1, px, e0).floor(gx0, gz, px, e1);
  t.rail(H, [X, 0, e0], [px, 0, e0], [px, 0, gz], [gx0, 0, gz], [gx0, 0, e1], [X, 0, e1]);
  return t.tee(0, 0, 0.6).cup(7.5, 0, gz + 2);
};
