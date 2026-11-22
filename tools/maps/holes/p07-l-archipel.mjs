import { hole, roundRect, disc, entry } from '../lib.mjs';

// L'Archipel (hard, par 4): islands in a lagoon, no road. Act 1: the causeway, 2.4 wide, no walls, to
// the round island. Act 2, two ways on: risky, the geyser on its south-west edge throws a ball that
// comes at it fast enough over the water onto the green island; safe, the cannon on its east edge
// lobs every ball onto the square island, and a walled plank goes from there to the green. A
// checkpoint on each island. All the lines meet on the green.
export default () => {
  const t = hole("L'Archipel", { theme: 'quai', par: 4, maxStrokes: 10 });
  const B = [0, -12, 3], D = [-6, -21, 3.5]; // the round island; the green island
  t.plate(roundRect(-4, -3, 4, 4, 1.5), 0, { open: [[0, -3, 5]] });
  t.floor(-1.2, -9.3, 1.2, -2.9); // the causeway
  t.plate(disc(B[0], B[1], B[2]), 0, { walls: false });
  t.pad('checkpoint', -1.5, -10.6, 1.5, -9.8, 0, { at: [0, 0.5, -10.4] });
  t.geyser(-1.9, -14.2, 0, { r: 0.5, speed: 7 });
  t.cannon(1.9, -12.6, 0, [8, 0, -22], { T: 1.2 });
  t.plate(roundRect(5, -25, 11, -19, 1.5), 0, { open: [[5, -21, 2.4]] }); // the square island
  t.pad('checkpoint', 8.5, -23, 9.5, -21, 0, { at: [9, 0.5, -22] });
  t.path([5, 0, -21], [-1, 0], { width: 2.4 }).reach(D[0], D[1], D[2]).done(); // the plank
  t.lake(-11, -28, 11, 4, [[-4, -3, 4, 4], [-1.2, -9.3, 1.2, -2.9], [-3, -15, 3, -9], [5, -25, 11, -19], [-3, -22.2, 5, -19.8], [-9.5, -24.5, -2.5, -17.5]]);
  return t.green(disc(D[0], D[1], D[2]), 0, D[0], D[1], { walls: false }).tee(0, 0, 1.5);
};
