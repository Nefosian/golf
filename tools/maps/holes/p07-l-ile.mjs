import { hole, roundRect, disc, entry } from '../lib.mjs';

// L'Île (medium, par 3): the green is an island in a lake. Safe: a walled road round the lake that comes
// in over a bridge from the west. Risky: a narrow causeway straight across, no walls, a checkpoint half
// way. The island is where the two lines meet.
export default () => {
  const t = hole("L'Île", { theme: 'quai', par: 3 });
  const [cx, cz, R] = [0, -24, 4];
  // the lake, in two: nothing may lie under the cup, and the middle of each pool must be open water
  t.water(-14, -34, -0.6, -6).water(0.6, -34, 14, -6);
  t.plate(roundRect(-6, -6, 6, 3, 1.5), 0, { open: [[-6, -1.5, 4.5], [0, -6, 2.2]] });
  t.path([-6, 0, -1.5], [-1, 0], { width: 4.5 }).straight(4).turn(-90, 3.5).straight(15.5).turn(-90, 3.5).reach(cx, cz, R).done();
  t.path([0, 0, -6], [0, -1], { width: 2.2, walls: 'none' }).reach(cx, cz, R).done();
  t.pad('checkpoint', -1.1, -13.5, 1.1, -12.5, 0, { at: [0, 0.5, -13] });
  return t.green(disc(cx, cz, R), 0, cx, cz, { open: [entry(cx, cz, R, -10, cz, 4.5), entry(cx, cz, R, cx, -6, 2.2)] }).tee(0, 0, 1);
};
