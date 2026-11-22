import { hole, V } from '../lib.mjs';

// L'Œil du Cyclone: two square rings of wind turn around the cup, in opposite directions, on grass;
// sand at the arena's border and in the eye wall between the rings stops whatever drifts. The eye,
// 4 x 4 of calm grass, holds the cup.
export default () => {
  const t = hole("L'Œil du Cyclone", { theme: 'canyon', par: 3 });
  const cz = -12.7; // the eye's center
  const E = 2, I = 4.5, W = 5.7, O = 9.7, B = 10.9; // half-sizes: eye, inner ring, eye wall, outer ring, border
  const ACC = 3; // a little over the grass's rolling resistance (2.2): a ball at rest drifts, at 4 u/s at most
  // square annulus between half-sizes a and b: four rectangles [x0, z0, x1, z1] (north and south take the corners)
  const ring = (a, b) => [[-b, cz - b, b, cz - a], [-b, cz + a, b, cz + b], [-b, cz - a, -a, cz + a], [a, cz - a, b, cz + a]];
  t.floor(-B, cz + O, B, 0); // the calm apron of the tee
  t.floor(-B, cz - B, B, cz - O, 0, 'sand').floor(-B, cz - O, -O, cz + O, 0, 'sand').floor(O, cz - O, B, cz + O, 0, 'sand'); // border
  for (const r of ring(W, O)) t.floor(...r, 0); // outer ring
  for (const r of ring(I, W)) t.floor(...r, 0, 'sand'); // eye wall
  for (const r of ring(E, I)) t.floor(...r, 0); // inner ring
  t.floor(-E, cz - E, E, cz + E, 0); // the eye
  t.fence(-B, cz - B, B, 0);
  // Winds: each side of a ring pushes along it, and each corner keeps the wind of the side that
  // flows into it, so a drifting ball ends in sand (or on the apron), never round and round.
  // 1.2 high: the client draws a wind (fans and streaks); a zone 0.3 high or less would be a conveyor belt
  const wind = (x0, z0, x1, z1, ax, az) => t.zone('wind', { shape: 0, c: V((x0 + x1) / 2, 0.6, (z0 + z1) / 2), h: V(Math.abs(x1 - x0) / 2, 0.6, Math.abs(z1 - z0) / 2), params: { accel: [ax, 0, az] } });
  // outer ring, clockwise seen from above: north side east, east side south, south side west, west side north
  wind(-W, cz - O, O, cz - W, ACC, 0);   // north side and NE corner
  wind(W, cz - W, O, cz + O, 0, ACC);    // east side and SE corner (out to the apron)
  wind(-O, cz + W, W, cz + O, -ACC, 0);  // south side and SW corner
  wind(-O, cz - O, -W, cz + W, 0, -ACC); // west side and NW corner
  // inner ring, counterclockwise: north side west, west side south, south side east, east side north
  wind(-I, cz - I, E, cz - E, -ACC, 0);  // north side and NW corner
  wind(-I, cz - E, -E, cz + I, 0, ACC);  // west side and SW corner
  wind(-E, cz + E, I, cz + I, ACC, 0);   // south side and SE corner
  wind(E, cz - I, I, cz + E, 0, -ACC);   // east side and NE corner
  t.post(0, cz + 0.9); // screens the cup from the tee: no straight ace, the eye is still one shot away
  return t.tee(0, 0, -1.5).cup(0, 0, cz);
};
