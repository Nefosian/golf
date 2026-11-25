import { hole, roundRect } from '../lib.mjs';

// La Fête Foraine (medium, par 3): a fairground arena. In the middle a bar turns like a merry-go-round;
// two boosters run up the sides (they speed a ball up the way it goes, they never turn it: a ball that
// takes one at an angle keeps its angle); bumper posts and two slingshots guard the cup. Safe: round
// the merry-go-round, along a side. Risky: a booster, aimed, straight at the cup. The coin waits in the
// far corner, behind a slingshot.
export default () => {
  const t = hole('La Fête Foraine', { theme: 'fete', par: 3 });
  t.plate(roundRect(-4, -3, 4, 3, 1.5), 0, { open: [[0, -3, 6]] });
  t.path([0, 0, -3], [0, -1], { width: 6 }).straight(4).done();
  t.pad('speedpad', -7.6, -12, -5.4, -10.6, 0, { dir: [0, 0, -1], speed: 12 });
  t.pad('speedpad', 5.4, -12, 7.6, -10.6, 0, { dir: [0, 0, -1], speed: 12 });
  t.spinner(0, -14.5, 0, 2.6, { period: 5 });
  for (const x of [-2.2, 2.2]) t.post(x, -19.5, 0, 0.45, 0.45, 'bumper');
  t.rail(0.45, [-8.4, 0, -21], [-6.2, 0, -24.6], 'bumper').rail(0.45, [8.4, 0, -21], [6.2, 0, -24.6], 'bumper'); // the slingshots
  t.disc('strokes', 6.6, -25.6, 0.45, 0, { add: -1 }, { once: true });
  return t.green(roundRect(-9, -28, 9, -7, 4), 0, 0, -23.5, { open: [[0, -7, 6]] }).tee(0, 0, 1);
};
