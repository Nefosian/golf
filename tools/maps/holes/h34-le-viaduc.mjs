import { hole } from '../lib.mjs';

// Le Viaduc: two ways to the same green. Up high, a viaduct 1.6 wide with no rail, cut by a 2 u
// gap that only a fast ball jumps (off a small lip), then a long sand brake that stops any run
// before it ends, 3 u short of the cup: the plunge is a shot of its own. Down below, a road that
// winds between baffles and sand; falling off the viaduct only puts the ball on it, and a ramp
// beside the gap climbs back up to the viaduct.
export default () => {
  const t = hole('Le Viaduc', { theme: 'chateau', par: 4 });
  const Y = 2.5, vw = 0.8; // the height of the viaduct, its half-width
  // the tee platform, solid, and the stairs down to the road, on the west
  t.block(-4.5, 2, 1, -1, -0.5, Y - 0.5).floor(-4.5, -1, 1, 2, Y); // the block stops under the floor
  t.slab([-3.25, Y, -1], [-3.25, 0, -9], 2.5);
  for (let i = 0; i < 4; i++) t.block(-4.5, -1 - 2 * i, -2, -3 - 2 * i, -0.5, Y * (1 - (2 * i + 2) / 8) - 0.05); // under the stairs
  t.rail(0.45, [-4.5, Y, 2], [-4.5, Y, -1], [-4.5, 0, -9]).rail(0.45, [-2, 0, -9], [-2, Y, -1], [-vw, Y, -1]);
  t.rail(0.45, [-4.5, Y, 2], [1, Y, 2], [1, Y, -1], [vw, Y, -1]);
  // the viaduct: 10 u, a lip, the gap, 10 u more with a sand brake before its end
  t.floor(-vw, -11, vw, -1, Y);
  t.slab([0, Y, -11], [0, Y + 0.15, -12], 2 * vw);
  t.floor(-vw, -17.5, vw, -14, Y).floor(-vw, -22.5, vw, -17.5, Y, 'sand').floor(-vw, -24, vw, -22.5, Y);
  // the ramp, east of the gap, up to a landing beside the end of the viaduct
  t.slab([2.45, 0, -11], [2.45, Y, -21], 2.5);
  for (let i = 0; i < 5; i++) t.block(1.2, -11 - 2 * i, 3.7, -13 - 2 * i, -0.5, Y * (2 * i) / 10 - 0.05); // under the ramp
  t.floor(vw, -24, 3.7, -21, Y).block(1.2, -24, 3.7, -21, -0.5, Y - 0.5);
  t.rail(1.2, [3.7, 0, -11], [3.7, Y, -21], [3.7, Y, -24]).rail(0.45, [3.7, Y, -24], [vw, Y, -24]); // the landing leads onto the viaduct only
  // the ground: under the first span, the road west of the ramp, the green
  t.floor(-2, -11, 5, -1).floor(-5, -11, -2, -9);
  // tiled edge to edge around the sand: no two floors overlap at the same height
  t.floor(-3, -24, 1.2, -11).floor(-5, -14.5, -3, -11).floor(-5, -24, -3, -18.5).floor(-5, -18.5, -3, -14.5, 0, 'sand');
  t.floor(-5, -30, 2, -24).floor(2, -27.5, 5, -24).floor(2, -30, 5, -27.5, 0, 'sand');
  // the outer walls, tall: a ball falling from the viaduct stays in
  t.rail(1.2, [-2, 0, -1], [5, 0, -1], [5, 0, -11], [3.7, 0, -11]);
  t.rail(1.2, [-5, 0, -9], [-5, 0, -30], [5, 0, -30], [5, 0, -24], [3.7, 0, -24]);
  // the baffles: the road winds east, west, east again into the green
  t.rail(0.45, [-5, 0, -14], [-1.5, 0, -14]).rail(0.45, [1.2, 0, -19], [-2.5, 0, -19]).rail(0.45, [-5, 0, -24], [-1, 0, -24]);
  t.rail(0.45, [-1.6, 0, -24], [-1.6, 0, -26.5]); // a stub on the green: no straight line from the plunge to the cup
  for (const z of [-4, -8, -16.5, -22]) t.post(0, z, 0, 0.35, Y - 0.05); // the pillars
  return t.tee(0, Y, 0.8).cup(-3, 0, -26.5);
};
