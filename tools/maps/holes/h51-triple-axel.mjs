import { hole } from '../lib.mjs';

// Triple Axel: a rink cut by three walls, low only behind the pads, a jumppad in front of each. On ice nothing stops:
// the glide has to go through the pads. The first pad spans the whole width; the second only the
// west half (a ball east of it bounces off the wall); the third is 2 u wide, on the east, beyond a
// high divider: go round its end, off the east cushion, or stop in a sand bank first. Sand banks
// alternate sides. Beyond the last wall, a sand band stops most jumps short of the house, a grass
// square where the cup is, curling-style.
// Each wall steps the rink down 0.3, by a 14° slope in front of the pad: every ball reaches a pad at
// 3 u/s at least and clears the wall 1.45 u beyond it (a ball falling back on a pad would bounce for
// ever). The sections are 12 long: the longest jump (11.6 u) never clears two walls.
export default () => {
  const t = hole('Triple Axel', { theme: 'banquise', par: 4 });
  const X = 5, C = 4.4; // the rink's half-width, the inner edge of the drifts (sand) on its sides
  const D = 0.3, P = 0.8, G = 1.45, SL = 1.2; // the step at each wall, the pad's depth, its gap to the wall, the slope's length
  // the rink: [z south, z north, y] of each section; a wall at the north end of the first three
  const secs = [[-1, -6, 0], [-6, -18, -D], [-18, -30, -2 * D], [-30, -40, -3 * D]];
  // the sand banks [x0, z south, x1, z north]: east in the first section, west in the second
  const banks = { 1: [1.4, -10, C, -12.8], 2: [-C, -22, -1.4, -24.8] };
  t.floor(-X, 2, X, -1); // the apron of the tee
  for (const [i, [z0, z1, y]] of secs.entries()) {
    if (i === 3) break; // the house's section, below
    const zf = z1 + G + SL; // where the slope down to the next pad starts
    t.floor(-X, z0, -C, zf, y, 'sand').floor(C, z0, X, zf, y, 'sand');
    const b = banks[i]; // the ice, tiled round the section's sand bank
    if (!b) t.floor(-C, z0, C, zf, y, 'ice');
    else {
      const [bx0, bzs, bx1, bzn] = b;
      t.floor(-C, z0, C, bzs, y, 'ice').floor(-C, bzn, C, zf, y, 'ice').floor(bx0, bzs, bx1, bzn, y, 'sand');
      if (bx0 > -C) t.floor(-C, bzs, bx0, bzn, y, 'ice');
      if (bx1 < C) t.floor(bx1, bzs, C, bzn, y, 'ice');
    }
    t.slab([0, y, zf], [0, y - D, zf - SL], 2 * X, 'ice');
    t.floor(-X, zf - SL, X, z1, y - D, 'ice'); // the strip of the pad, at the foot of the wall
  }
  const pad = (x0, x1, i) => {
    const z1 = secs[i][1], y = secs[i][2] - D;
    t.pad('jumppad', x0, z1 + G, x1, z1 + G - P, y, { speed: 6.5 });
    // the wall: low (0.45) behind the pad, high elsewhere: a fast ball flying off the slope's edge
    // does not hop it
    t.rail(0.45, [x0, y, z1], [x1, y, z1]);
    if (x0 > -X) t.rail(1, [-X, y, z1], [x0, y, z1]);
    if (x1 < X) t.rail(1, [x1, y, z1], [X, y, z1]);
    // stubs at the pad's open ends: a ball resting beside it cannot crawl in sideways
    for (const x of [x0, x1]) if (Math.abs(x) < X) t.rail(0.45, [x, y, z1 + G], [x, y, z1]);
  };
  pad(-X, X, 0); // act 1: the whole width
  pad(-X, 0, 1); // act 2: the west half
  pad(C - 2, C, 2); // act 3: 2 u, on the east
  const y2 = -2 * D, y3 = -3 * D;
  // a high divider down the middle of the second section, from its wall to 2.4 u short of the
  // next slope: what jumped the west pad cannot slide on into the east one; it is turned round its end.
  t.rail(1.8, [0, y2, -18], [0, y2, -25]);
  // the last section: a sand band (the hog line) where the third jump lands, then the house, 5 x 5
  // of grass in the ice, and a sand drift at the back
  const hx = -0.5, hz = -35.5, hh = 2.5, zb = -38.4;
  t.floor(-X, -30, X, hz + hh, y3, 'sand');
  t.floor(-X, hz + hh, -C, zb, y3, 'sand').floor(C, hz + hh, X, zb, y3, 'sand').floor(-X, -40, X, zb, y3, 'sand');
  t.floor(-C, hz - hh, C, zb, y3, 'ice');
  t.floor(-C, hz + hh, hx - hh, hz - hh, y3, 'ice').floor(hx + hh, hz + hh, C, hz - hh, y3, 'ice');
  t.floor(hx - hh, hz - hh, hx + hh, hz + hh, y3);
  // the boards, high enough for a slanted jump (1.2 u up)
  const H = 1.8;
  for (const s of [-1, 1]) {
    const pts = [[s * X, 0, 2], [s * X, 0, -1]];
    for (const [i, [z0, z1, y]] of secs.entries()) {
      if (i < 3) pts.push([s * X, y, z1 + G + SL], [s * X, y - D, z1 + G]);
      else pts.push([s * X, y, z1]);
    }
    t.rail(H, ...pts);
  }
  t.rail(H, [-X, 0, 2], [X, 0, 2]).rail(H, [-X, y3, -39], [X, y3, -39]);
  return t.tee(1.5, 0, 0.5).cup(hx, y3, hz);
};
