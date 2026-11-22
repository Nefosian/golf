import { hole } from '../lib.mjs';

// La Luge: a luge run of ice, 3.5 wide, with turns cut at 45°. On the ice every shot runs on, so what
// counts is the speed it arrives with. The upper run ends in a patch of snow (sand) where a slow ball
// stops and a fast one goes through; the lower run has a chicane, a straight 1.5 gate on the inside or
// a longer way round on the outside; it ends in snow, and the green opens north of it, round the
// corner: no ball runs straight from the ice to the cup.
export default () => {
  const t = hole('La Luge', { theme: 'banquise', par: 3 });
  const ice = (x0, z0, x1, z1) => t.floor(x0, z0, x1, z1, 0, 'ice');
  t.floor(-3.5, -1.75, 0, 1.75);                     // the tee
  ice(0, -1.75, 15.5, 1.75);                         // the upper run: east, the first turn,
  ice(12, -10, 15.5, -1.75);                         // north
  t.floor(12, -11.5, 15.5, -10, 0, 'sand');          // the snow in the middle, 1.5 deep
  ice(12, -15, 15.5, -11.5);                         // the second turn
  ice(0, -15, 12, -11.5).floor(3, -16.5, 10, -15, 0, 'ice'); // the lower run, west, widened at the chicane
  t.floor(-6, -15, 0, -11.5, 0, 'sand');             // the finish: snow at the end of the run
  t.floor(-6, -21, 0, -15).floor(-6, -21.6, 0, -21, 0, 'sand'); // the green north of it, sand at the back
  const R = (...p) => t.rail(0.45, ...p.map(([x, z]) => [x, 0, z]));
  // the boards; each turn sends a ball on along the next run, shifted sideways by where it hit it:
  // the line through the turns is set by the line of the shot
  R([-3.5, -1.75], [-3.5, 1.75], [12, 1.75], [15.5, -1.75], [15.5, -11.5], [12, -15], [10, -15], [9.5, -16.5], [5, -16.5], [3, -15],
    [0, -15], [0, -21.6], [-6, -21.6], [-6, -11.5]);
  R([-3.5, -1.75], [12, -1.75], [12, -11.5], [-6, -11.5]);
  // the chicane: a wedge whose south side leaves a straight gate 1.5 wide; its long slanted north
  // face turns the other balls round the outside, where the slanted end of the bulge sends them on
  R([9, -13], [4, -13], [4.5, -14.2], [9, -13]);
  return t.tee(-1.75, 0, 0).cup(-4.2, 0, -19);
};
