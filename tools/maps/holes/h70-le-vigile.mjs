import { hole } from '../lib.mjs';

// Le Vigile: a corridor guarded by two sliding blocks that are also gates of the key. Without the
// key they are moving obstacles to slip past (a slow one, then a fast one); the key lies at the
// far end. With it, the guards let the ball through like ghosts, and so does the door of the
// green, a pocket right beside the tee: the hole is an out-and-back.
export default () => {
  const t = hole('Le Vigile', { theme: 'ville', par: 4 });
  const X = 4, IN = X - 0.15, C = 0.15, H = 0.45; // half-width, inner face of the side walls, guard clearance at the walls
  const end = -30; // the far wall
  t.floor(-X, end, X, 2);
  // the green: a 6 x 6.5 pocket east of the tee, behind the corridor's wall; its door is blue
  const gx = 10, gz0 = -4.5, d0 = -3.6, d1 = -0.6; // the pocket's east edge, its north edge, the door
  t.floor(X, gz0, gx, 2);
  t.rail(H, [X, 0, d1], [X, 0, 2], [-X, 0, 2], [-X, 0, end], [X, 0, end], [X, 0, d0]);
  t.rail(H, [X, 0, d0], [X, 0, gz0], [gx, 0, gz0], [gx, 0, 2], [X, 0, 2]);
  t.block(X - 0.15, d0, X + 0.15, d1, -0.15, H, { key: 1 });
  // the guards: 3.5 x 1 blocks of the key, sliding from wall to wall (a 4 wide gap on one side,
  // two 2 wide ones when in the middle); whatever lies in their way is pushed to the wall
  const L = 3.5, m = 2 * IN - 2 * C - L;
  const guard = (z, period, phase) => t.block(-IN + C, z - 0.5, -IN + C + L, z + 0.5, -0.05, 0.6,
    { key: 1, motion: { period, move: [m, 0, 0], pivot: [0, 0, 0], axis: [0, 0, 0], ...(phase ? { phase } : {}) } });
  guard(-9.5, 6); // act 1: the slow guard
  guard(-19, 3.5, 0.5); // act 2: the fast one, in front of the key
  t.pad('key', -2, end + 3.5, 2, end + 1, 0, { key: 1 }); // the key, against the far wall
  return t.tee(-1.5, 0, 0).cup(7.5, 0, -1.2);
};
