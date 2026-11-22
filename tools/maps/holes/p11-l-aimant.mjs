import { hole, roundRect, disc, entry } from '../lib.mjs';

// L'Aimant (medium, par 3): the round green hangs over the void, its far half without a wall; a magnet
// under it bends every ball rolling near the cup towards it (not quite strong enough to move a ball at
// rest): it catches a ball that comes in a little too fast, not one that comes in much too fast. Two
// repellers on the direct line push away the shots aimed too straight; the coin waits on the bare
// edge. Everything converges on the cup: the jostle is on it, over the void.
export default () => {
  const t = hole("L'Aimant", { theme: 'nuit', par: 3 });
  const [cx, cz, R] = [0, -24, 6];
  t.plate(roundRect(-6, -2, 6, 3, 1.5), 0, { open: [[0, -2, 9]] });
  t.path([0, 0, -2], [0, -1], { width: 9 }).reach(cx, cz, R).done();
  t.disc('magnet', -1.4, -11, 2, 0, { at: [-1.4, 0, -11], accel: -8 });
  t.disc('magnet', 1.4, -11, 2, 0, { at: [1.4, 0, -11], accel: -8 });
  t.disc('magnet', cx, cz, 4.5, 0, { at: [cx, 0, cz], accel: 2 });
  t.disc('strokes', cx + 4.2, cz - 3.8, 0.45, 0, { add: -1 }, { once: true });
  return t.green(disc(cx, cz, R), 0, cx, cz, { open: [entry(cx, cz, R, cx, -2, 9), [cx, cz - R, 2 * R * 0.95]] }).tee(0, 0, 1.5);
};
