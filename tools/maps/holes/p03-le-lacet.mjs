import { hole, roundRect } from '../lib.mjs';

// Le Lacet (easy, par 3): a long way down in three switchbacks, the green at the bottom. Each switchback
// slopes down, flat in its middle; hairpins are flat. Safe: follow the road. Risky: in the flat middle
// of a switchback, a 2-wide gap in the wall opens on a chute (no walls) straight down to the next one,
// 1.5 lower: aim at the gap, keep on the chute. The second switchback is open on both sides there: a
// ball coming down the first chute may go on down the second. Balls that cut land among the others.
// A row of moles guards the last flat (where the second chute lands); a coin halfway down that chute.
export default () => {
  const t = hole('Le Lacet', { theme: 'canyon', par: 3 });
  const w = 4.5, r = 4.5, gap = 2; // the road; its hairpins (switchbacks 2r apart); the chutes' width
  const top = 5.5, step = 0.75;    // the tee's height; each slope (two a switchback)
  t.plate(roundRect(0, -4, 7, 4, 1.5), top, { open: [[0, 0, w]] });
  // a switchback: down, a flat middle (where the chutes are), down; walls: of the middle
  const sw = (P, first, walls) => (first ? P.straight(3.25, { rise: -step }).straight(gap, { walls }).straight(4.75, { rise: -step })
    : P.straight(4.75, { rise: -step }).straight(gap, { walls }).straight(3.25, { rise: -step }));
  const P = t.path([0, top, 0], [-1, 0], { width: w });
  sw(P, true, 'left').turn(-180, r);          // west, open on its south side
  sw(P, false, 'none').turn(180, r);          // east, open on both sides
  sw(P, true, 'right').done();                // west again, open on its north side
  // the chutes, between the flat middles (x -3.25 to -5.25), from one road's edge to the next one's
  const mid = -4.25, ys = [top - step, top - 3 * step, top - 5 * step];
  for (let k = 0; k < 2; k++) {
    const z0 = -2 * r * k - w / 2, z1 = -2 * r * (k + 1) + w / 2, drop = ys[k] - ys[k + 1], slope = drop / (z0 - z1);
    t.slab([mid, ys[k], z0 + 0.2], [mid, ys[k + 1] - slope * 0.4, z1 - 0.2], gap); // in under both roads' edges
  }
  for (const z of [-19.6, -18, -16.4]) t.mole(-4.25, z, ys[2], { r: 0.45, period: 2.4, phase: (z + 20) / 4.8 });
  t.disc('strokes', mid, -13.5, 0.45, (ys[1] + ys[2]) / 2, { add: -1 }, { once: true });
  return t.green(roundRect(-19, -23, -10, -13, 2), top - 6 * step, -15.5, -18, { open: [[-10, -18, w]] }).tee(4, top, 0);
};
