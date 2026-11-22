import { hole } from '../lib.mjs';

// Le Bowling: a bowling lane. A speedpad spans the whole width: wherever the ball crosses it, it
// leaves straight ahead at 16, keeping its place across the lane, and that place is what one aims.
// Ten pins in a triangle block the middle of the lane; the two clean lines run on either side of
// it, between the pins and the sand gutters. Behind the pins, the pit: sand, the cup in its middle,
// and the balls already there, which are pins too.
export default () => {
  const t = hole('Le Bowling', { theme: 'ville', par: 3 });
  const X = 4, G = 1; // half-width of the lane, width of a gutter
  const zPad = -5, zLane = -6, zPit = -22, zEnd = -27; // the pad from zPad to zLane, the lane, the pit
  t.floor(-X, zPad, X, 1.5); // the approach
  t.floor(-X, zLane, X, zPad); // under the pad
  t.floor(-X + G, zPit, X - G, zLane); // the lane
  t.floor(-X, zPit, -X + G, zLane, 0, 'sand').floor(X - G, zPit, X, zLane, 0, 'sand'); // the gutters
  t.floor(-X, zEnd, X, zPit, 0, 'sand'); // the pit
  t.fence(-X, 1.5, X, zEnd);
  t.pad('speedpad', -X, zLane, X, zPad, 0, { dir: [0, 0, -1], speed: 16 });
  // the pins: rows 1.2 apart along the lane's axis times sin 60°, 1.2 apart across it
  const z1 = -17, dz = 1.2 * Math.sqrt(3) / 2;
  for (let row = 0; row < 4; row++)
    for (let i = 0; i <= row; i++) t.post((i - row / 2) * 1.2, z1 - row * dz, 0, 0.25);
  return t.tee(0, 0, 0).cup(0, 0, -24.5);
};
