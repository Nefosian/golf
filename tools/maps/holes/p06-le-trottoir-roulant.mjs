import { hole, roundRect } from '../lib.mjs';

// Le Trottoir Roulant (easy, par 3): two moving walkways side by side, the left one carrying to the
// green, the right one back to the tee, a low divider between them with two gaps. Safe: put the ball
// on the left walkway, it does the rest. Risky: run up the right one, against it, for the coin. Balls
// cross from one walkway to the other at the gaps. A trolley shuttles across the left walkway; two
// moles pop up on the right one.
export default () => {
  const t = hole('Le Trottoir Roulant', { theme: 'ville', par: 3 });
  t.plate(roundRect(-7, -2, 7, 4, 1.5), 0, { open: [[0, -2, 9]] });
  t.floor(-4.5, -24, 4.5, -2);
  t.rail(0.45, [-4.5, 0, -2], [-4.5, 0, -24]).rail(0.45, [4.5, 0, -2], [4.5, 0, -24]);
  t.rail(0.3, [0, 0, -2], [0, 0, -9]).rail(0.3, [0, 0, -11], [0, 0, -16]).rail(0.3, [0, 0, -18], [0, 0, -24]); // the divider
  t.pad('wind', -4.5, -24, -0.15, -2, 0, { accel: [0, 0, -3] }); // thin: a walkway
  t.pad('wind', 0.15, -24, 4.5, -2, 0, { accel: [0, 0, 3] });
  t.disc('strokes', 2.3, -14, 0.5, 0, { add: -1 }, { once: true });
  t.slider(-4.3, -14.3, -3.1, -13.7, 0, 0.5, [2.8, 0], { period: 3 }); // the trolley, across (along it, a ball carried against it never stopped)
  t.mole(2.3, -6.5, 0, { r: 0.5, period: 2.6 }).mole(2.3, -20, 0, { r: 0.5, period: 2.6, phase: 0.5 });
  t.green(roundRect(-7, -32, 7, -24, 2), 0, 1.5, -29, { open: [[0, -24, 9]] });
  return t.tee(-2.5, 0, 1.5);
};
