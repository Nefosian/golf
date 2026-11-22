import { hole, roundRect, disc, entry } from '../lib.mjs';

// L'Aimant (medium, par 3): a magnet under the round green bends every ball rolling near the cup towards
// it (not quite strong enough to move a ball at rest); two repellers on the direct line push away the
// shots aimed too straight. Safe: come in from a side, the magnet does the rest. Risky: between the
// repellers. Everything converges on the cup: the jostle is on it.
export default () => {
  const t = hole("L'Aimant", { theme: 'nuit', par: 3 });
  const [cx, cz, R] = [0, -24, 6];
  t.plate(roundRect(-6, -2, 6, 3, 1.5), 0, { open: [[0, -2, 9]] });
  t.path([0, 0, -2], [0, -1], { width: 9 }).reach(cx, cz, R).done();
  t.disc('magnet', -1.4, -11, 2, 0, { at: [-1.4, 0, -11], accel: -8 });
  t.disc('magnet', 1.4, -11, 2, 0, { at: [1.4, 0, -11], accel: -8 });
  t.disc('magnet', cx, cz, 3.5, 0, { at: [cx, 0, cz], accel: 1.4 });
  return t.green(disc(cx, cz, R), 0, cx, cz, { open: [entry(cx, cz, R, cx, -2, 9)] }).tee(0, 0, 1.5);
};
