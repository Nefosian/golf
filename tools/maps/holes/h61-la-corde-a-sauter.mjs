import { hole, V } from '../lib.mjs';

// La Corde à Sauter: giant skipping ropes turn across a corridor, each a bar going round a
// horizontal axis 1.2 away and grazing the floor. A jumppad in front of each throws the balls over
// it: when the rope is at the floor or high up, they pass; when it is half-way, it mows them down.
// A slow rope with a free lane beside it, a fast one across the whole width; the corridor turns
// west, and two ropes turn opposite ways: the first throws its victims back, the second pushes
// them on to the end of the corridor, and the green in a pocket beside it.
export default () => {
  const t = hole('La Corde à Sauter', { theme: 'bocage', par: 4 });
  const X = 4, IN = X - 0.15; // half-width, inner face of the side walls
  const RR = 1.2, B = 0.1, PY = 0.05 + B + RR; // rope radius, half thickness of the bar, axis height
  // rope: a bar across the corridor turning around the axis at height PY; ns: the corridor runs
  // north (the bar from x0 to x1 at z = w), else west (from z0 to z1 at x = w); back: its bottom
  // moves towards the players
  const rope = (ns, a0, a1, w, period, back, phase = 0) => {
    const m = (a0 + a1) / 2, hl = (a1 - a0) / 2;
    const pivot = ns ? V(m, PY, w) : V(w, PY, m);
    const axis = ns ? [back ? -1 : 1, 0, 0] : [0, 0, back ? 1 : -1];
    t.raw({ shape: 0, kind: 1, c: V(pivot[0], PY - RR, pivot[2]), h: ns ? V(hl, B, B) : V(B, B, hl), motion: { period, phase, move: [0, 0, 0], pivot, axis } });
  };
  // jumppad of the given box: taller than the jump (1 high), so a ball falling back on it does not
  // enter it again
  const pad = (x0, z0, x1, z1) => t.zone('jumppad', { shape: 0, c: V((x0 + x1) / 2, 0.8, (z0 + z1) / 2), h: V(Math.abs(x1 - x0) / 2, 0.8, Math.abs(z1 - z0) / 2), params: { speed: 6 } });
  // the corridor: north from the tee to z = -27, then west to x = -25 (8 wide); tall walls: a
  // ball a rope throws back onto its pad jumps again, and stays in
  const zN = -27, zW = -19, xW = -25;
  // the green is a pocket off the north side of its end (x -25..-18, z -27..-33)
  const xg = -18, zg = -33;
  t.floor(-X, zN, X, 2).floor(xW, zN, -X, zW).floor(xW, zg, xg, zN);
  t.rail(3, [-X, 0, zW], [-X, 0, 2], [X, 0, 2], [X, 0, zN], [xg, 0, zN], [xg, 0, zg], [xW, 0, zg], [xW, 0, zW], [-X, 0, zW]);
  // act 1: the slow rope (4 s) over the left 6 u; a free lane on the right, behind a wall
  const xd = 2.15;
  t.rail(0.45, [xd, 0, -3.5], [xd, 0, -10.5]);
  pad(-IN, -4.2, xd - 0.15, -5);
  rope(true, -IN + 0.05, xd - 0.2, -7, 4, true);
  // act 2: the fast rope (2.4 s), the pad across the whole width; its balls end against the
  // corridor's end wall
  pad(-IN, -15.2, IN, -16);
  rope(true, -IN + 0.05, IN - 0.05, -18, 2.4, true, 0.5);
  // the turn: a wall closes the inner side of the corner but 4 u, no drive cuts it
  t.rail(3, [-X, 0, zW], [-X, 0, zN + 4]);
  // act 3, west: one pad, two ropes 3 apart turning opposite ways
  const zi0 = zN + 0.15, zi1 = zW - 0.15;
  pad(-6.2, zi0, -7, zi1);
  rope(false, zi0 + 0.05, zi1 - 0.05, -9, 3, true, 0.25);
  rope(false, zi0 + 0.05, zi1 - 0.05, -12, 3, false, 0.75);
  // no straight line from the turn reaches the cup in the pocket: act 3 first, then the putt
  return t.tee(0, 0, 0).cup(-21.5, 0, -30);
};
