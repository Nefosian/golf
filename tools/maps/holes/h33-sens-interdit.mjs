import { hole } from '../lib.mjs';

// Sens Interdit: rows of speedpads across the corridor point back at the tee and send a ball that
// touches them back down at 8 u/s; only the gaps let it through. The last row hides one friendly
// pad that throws the ball onto the green. Sand at the foot of the south wall stops the refused.
export default () => {
  const t = hole('Sens Interdit', { theme: 'ville', par: 4 });
  const W = 5, zs = 2.5, zn = -31; // the corridor
  t.floor(-W, -29.5, W, -1).floor(-1, -1, 1, zs); // grass, and the tee's patch
  t.floor(-W, -1, -1, zs, 0, 'sand').floor(1, -1, W, zs, 0, 'sand'); // around the tee
  t.floor(-W, zn, W, -29.5, 0, 'sand'); // the back of the green: no rebound onto the last row
  t.fence(-W, zn, W, zs);
  const back = { dir: [0, 0, 1], speed: 8 };
  // a row at z: the pads between its gaps, [x0, x1] each
  const row = (z, ...pads) => { for (const [x0, x1] of pads) t.pad('speedpad', x0, z + 0.5, x1, z - 0.5, 0, back); };
  // From the tee, one diagonal threads the gaps of the first two rows and stops in the calm band;
  // from there, one line through the third gap meets the friend.
  row(-8, [-W, -2.4], [0.1, 2], [4.5, W]); // first row: two gaps of 2.5
  row(-14, [-W, -2.75], [-1.25, W]); // then one gap of 1.5 each, staggered, a calm band of 3 between
  row(-18, [-W, -1.25], [0.25, W]);
  row(-23, [-W, 2.5]); // the last row, and its friend at the east wall
  t.pad('speedpad', 2.5, -22.5, W, -23.5, 0, { dir: [0, 0, -1], speed: 8 });
  return t.tee(0, 0, 0).cup(-1.5, 0, -27);
};
