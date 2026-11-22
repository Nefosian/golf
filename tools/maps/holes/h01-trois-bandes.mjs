import { hole } from '../lib.mjs';

// Trois Bandes: a billiard table in two rooms, nothing but walls. A screen leaves a 4-wide passage on
// the east; the cup sits in an alcove open only to the north wall: it takes a cushion to get in.
export default () => {
  const t = hole('Trois Bandes', { theme: 'ville', par: 3 });
  t.floor(-6, -21, 6, 1.5);
  t.fence(-6, -21, 6, 1.5);
  t.rail(0.45, [-6, 0, -8], [2, 0, -8]); // the screen; the passage is x 2..6
  t.rail(0.45, [-1.8, 0, -17.5], [-1.8, 0, -14.5], [1.8, 0, -14.5], [1.8, 0, -17.5]); // the alcove, open to the north
  t.disc('strokes', -5, -7, 0.5, 0, { add: -1 }, { once: true }); // the coin: behind the screen, away from the passage
  return t.tee(0, 0, 0).cup(0, 0, -16.3);
};
