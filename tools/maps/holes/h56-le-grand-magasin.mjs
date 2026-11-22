import { hole } from '../lib.mjs';

// Le Grand Magasin: four floors, 2 u apart, each set back to the north of the one below, and
// escalators: belts on 25° ramps, too steep to climb at a putt. Beside each escalator, a plain ramp
// comes down from the floor above. Act 1: the first escalator is straight ahead. Act 2: on the first
// landing the next one is at the far east corner; on the way, the mouth of the way down gapes on
// the south edge, and the ramp coming down from above spills balls across the landing. Act 3: on
// the second landing, two escalators to the roof: a wide slow one on the west, a narrow fast one on
// the east that drops the ball near the cup.
export default () => {
  const t = hole('Le Grand Magasin', { theme: 'ville', par: 4 });
  const X = 6, R = 2, run = R / Math.tan(25 * Math.PI / 180), a = 25 * Math.PI / 180; // half-width, rise, ramp run
  // [z south, z north] of the ground, the two landings and the roof; each riser is run deep
  const lv = [[3, -4]];
  for (let i = 1; i < 4; i++) { const s = lv[i - 1][1] - run; lv.push([s, s - (i === 3 ? 7 : 6)]); }
  const y = i => i * R;
  // a ramp between level i (south) and i + 1 (north), x0 to x1; accel: an escalator's belt
  const ramp = (i, x0, x1, accel) => {
    const zs = lv[i][1], zn = lv[i + 1][0], xc = (x0 + x1) / 2;
    t.slab([xc, y(i), zs], [xc, y(i + 1), zn], x1 - x0);
    if (accel) {
      const s = t.h.colliders.at(-1), L = run / Math.cos(a);
      t.block(x0, zn, x1, zn - 1.2, y(i + 1) + 0.5, y(i + 1) + 0.8); // the floor above's edge, a lintel over the exit: a ball does not take off
      t.zone('wind', { shape: 0, c: [xc, (y(i) + y(i + 1)) / 2 + 0.15 * Math.cos(a), (zs + zn) / 2 + 0.15 * Math.sin(a)], rot: s.rot, h: [L / 2, 0.15, (x1 - x0) / 2], params: { accel: [0, accel * Math.sin(a), -accel * Math.cos(a)] } });
    }
  };
  // a riser: solid between its ramps (given as [x0, x1] gaps), up to the floor above
  const riser = (i, gaps) => {
    const zs = lv[i][1], zn = lv[i + 1][0];
    let x = -X;
    for (const [g0, g1] of [...gaps, [X, X]]) {
      if (g0 > x) t.block(x, zs, g0, zn, 0, y(i + 1), { kind: 0 });
      x = g1;
    }
    // a rail along its top edge, over the floor below, but for the ramps' mouths
    x = -X;
    for (const [g0, g1] of [...gaps, [X, X]]) {
      if (g0 > x) t.rail(1, [x, y(i + 1), zs], [g0, y(i + 1), zs]);
      x = g1;
    }
  };
  t.floor(-X, lv[0][0], X, lv[0][1]); // the ground floor
  for (let i = 1; i < 4; i++) t.block(-X, lv[i][0], X, lv[i][1], 0, y(i), { kind: 0 }); // the landings and the roof, solid
  // act 1: escalator 1 straight ahead (x -5 to -1), the way down from landing 1 beside it (x 1 to 4)
  ramp(0, -5, -1, 11); ramp(0, 1, 4); // 11: the least that carries a ball at rest up 25°
  riser(0, [[-5, -1], [1, 4]]);
  // act 2: on landing 1, the way down from landing 2 lands in the middle (x -0.5 to 2, east of escalator 1's line), escalator 2
  // is in the north-east corner (x 2.5 to 6)
  ramp(1, -0.5, 2); ramp(1, 2.5, X, 11);
  riser(1, [[-0.5, 2], [2.5, X]]);
  // a shelf on landing 1, from its north wall 4 u south, between the way down and escalator 2: no
  // straight line from escalator 1 into escalator 2; one goes round it, past the mouth of the way down
  t.rail(1, [2.25, y(1), lv[1][1]], [2.25, y(1), lv[1][1] + 4]);
  // act 3: on landing 2, the wide slow escalator (x -6 to -2) and the narrow fast one (x 2.5 to 4.5)
  ramp(2, -X, -2, 11); ramp(2, 2.5, 4.5, 24);
  riser(2, [[-X, -2], [2.5, 4.5]]);
  // the outer walls, up the levels and the risers: a ball leaving an escalator fast takes off
  const H = 1.2;
  const rampAtEdge = [[false, false], [false, true], [true, false]]; // [west, east] of each riser
  for (const [k, s] of [[0, -1], [1, 1]]) {
    for (let i = 0; i < 4; i++) {
      t.rail(H, [s * X, y(i), lv[i][0]], [s * X, y(i), lv[i][1]]);
      if (i === 3) break;
      const yr = rampAtEdge[i][k] ? y(i) : y(i + 1); // up the ramp, or along the riser's flat top
      t.rail(H, [s * X, yr, lv[i][1]], [s * X, y(i + 1), lv[i + 1][0]]);
    }
  }
  t.rail(H, [-X, 0, lv[0][0]], [X, 0, lv[0][0]]).rail(2.5, [-X, y(3), lv[3][1]], [X, y(3), lv[3][1]]); // high at the back of the roof: the fast escalator throws balls
  return t.tee(-3, 0, 1).cup(0.5, y(3), lv[3][0] - 3.5);
};
