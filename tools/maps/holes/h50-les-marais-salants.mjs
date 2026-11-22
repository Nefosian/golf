import { hole, V as v3 } from '../lib.mjs';

// Les Marais Salants: a 20 x 20 checkerboard of salt pans, the dikes between them without rails.
// Tee in the south-west corner, cup in the north-east one (a green in place of the last pan). The
// dikes narrow from 2 to 1.5 in the heart of the marsh, then 1.2 for the last one. A plank juts
// into one pan, a salt heap at its end: a bonus stroke, for a detour.
export default () => {
  const t = hole('Les Marais Salants', { theme: 'quai', par: 5, maxStrokes: 12 });
  // a pan: water flush with the dikes, so a ball is out as soon as its center leaves a dike (with
  // the water lower, a ball cutting a crossing's corner hits the next dike's edge and hops the pans)
  const pan = (x0, z0, x1, z1) => {
    t.floor(x0, z0, x1, z1, 0);
    t.zone('hazard', { shape: 0, c: v3((x0 + x1) / 2, 0.125, (z0 + z1) / 2), h: v3(Math.abs(x1 - x0) / 2, 0.125, Math.abs(z1 - z0) / 2) });
  };
  const S = 20, M = 2; // the marsh's side, the water margin around it
  const V = [5, 10, 15]; // x of the dikes running north
  const D = [[-1, 2], [-6.5, 2], [-11.25, 1.5], [-15.6, 1.2]]; // [z, width] of the dikes running east
  const bandW = [2, 1.5, 1.5, 1.2]; // width of the north dikes between D[i] and the next (the last: to the north edge)
  // the dikes running east, edge to edge; the first one breached between the last two north dikes
  // (no running along the edge of the marsh to its far side)
  const breach = [11.5, 13.5];
  D.forEach(([z, w], i) => {
    if (i > 0) return t.floor(0, z + w / 2, S, z - w / 2);
    t.floor(0, z + w / 2, breach[0], z - w / 2).floor(breach[1], z + w / 2, S, z - w / 2);
    pan(breach[0], z + w / 2, breach[1], z - w / 2);
  });
  // the dikes running north, between them; a plank, 0.8 wide, juts into the pan [1, 2] (between
  // the first two north dikes, in the third band) from the dike south of it
  const pier = [1, 2], PW = 0.4, PL = 2.2; // its pan, half width, length
  const bands = D.map(([z, w], i) => [z - w / 2, i + 1 < D.length ? D[i + 1][0] + D[i + 1][1] / 2 : -S]);
  const pans = []; // [x0, z0, x1, z1] of the water pans
  bands.forEach(([z0, z1], b) => {
    let x = 0;
    V.forEach((vx, c) => {
      const w = bandW[b];
      t.floor(vx - w / 2, z0, vx + w / 2, z1);
      if (c === pier[0] && b === pier[1]) { // the pan with the plank: water round it
        const px = (x + vx - w / 2) / 2;
        t.floor(px - PW, z0, px + PW, z0 - PL);
        pans.push([x, z0, px - PW, z1], [px + PW, z0, vx - w / 2, z1], [px - PW, z0 - PL, px + PW, z1]);
        t.disc('strokes', px, z0 - PL + 0.45, 0.35, 0, { add: -1 }, { once: true }); // the salt heap
      } else pans.push([x, z0, vx - w / 2, z1]);
      x = vx + w / 2;
    });
    if (b < bands.length - 1) pans.push([x, z0, S, z1]);
    else t.floor(x, z0, S, z1); // the green, in the north-east corner
  });
  for (const p of pans) pan(...p);
  // the margin, water all round
  pan(-M, M, S + M, 0); pan(-M, -S, S + M, -S - M); pan(-M, 0, 0, -S); pan(S, 0, S + M, -S);
  return t.tee(1.2, 0, -1).cup(18, 0, -18.3);
};
