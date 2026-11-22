import { hole } from '../lib.mjs';

// Fenêtre de Tir: two cannons fire over two moats, through tall shutters that slide across the
// arc: get into the breech when the window is open. The first moat has one slow shutter (open
// about half the time) and a corridor round it; the second, two shutters that cross (a third).
export default () => {
  const t = hole('Fenêtre de Tir', { theme: 'chateau', par: 4, maxStrokes: 10 });
  const W = 0.45, wy = -0.3;
  // a shutter: a tall panel over the water, sliding along x (moving things are drawn striped).
  const shutter = (x, z, hw, move, period, phase = 0) => t.raw({ shape: 0, kind: 1, c: [x, 4.2, z], h: [hw, 4.5, 0.15],
    motion: { period, ...(phase ? { phase } : {}), move: [move, 0, 0], pivot: [0, 0, 0], axis: [0, 0, 0] } });
  // lawn (8 x 6) and the east corridor (3 wide) that goes round the first moat to the platform.
  t.floor(-4, -4, 4, 2).floor(4, -21, 7, 2);
  t.rail(W, [-4, 0, -4], [-4, 0, 2], [7, 0, 2], [7, 0, -21], [-4, 0, -21], [-4, 0, -13], [4, 0, -13], [4, 0, -4], [-4, 0, -4]);
  // the platform (8 x 8) and the green (8 x 7), walled all round.
  t.floor(-4, -21, 4, -13).floor(-4, -37, 4, -30).fence(-4, -37, 4, -30);
  t.water(-10, -13, 4, -4, wy).water(-7, -30, 11, -21, wy);
  // first cannon: 1.8 s of flight, lands on the platform around z = -15.
  t.disc('launcher', 0, -2.5, 0.6, 0, { v: [0, 16.2, -6.94] });
  shutter(-7, -11, 2.5, 7, 4); // parked west, shuts the arc 42% of the time; far side, so a ball it stops drops in
  t.pad('checkpoint', -4, -15.5, 7, -14.5, 0, { at: [-2, 0, -15] });
  // second cannon, off the line the first one's balls roll along; lands on the green around z = -32.
  t.disc('launcher', 2, -19, 0.5, 0, { v: [0, 16.2, -7.2] });
  shutter(8, -27, 2.8, -12, 9); shutter(8, -28.5, 2.8, -12, 9, 0.75); // crossing: open a third of the time
  return t.tee(0, 0, 1).cup(-1.5, 0, -34);
};
