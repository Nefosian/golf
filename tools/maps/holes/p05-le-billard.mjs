import { hole, roundRect, arc } from '../lib.mjs';

// Le Billard (easy, par 2): a big table with rounded corners, nothing but cushions. The cup sits behind
// a curved screen open to the back: it takes the back cushion to get in. The coin hides behind a stub of
// cushion on the left: two cushions. Readable, short; balls cross on the rebounds.
export default () => {
  const t = hole('Le Billard', { theme: 'ville', par: 2 });
  t.green(roundRect(-6, -20, 6, 2, 2.5), 0, 2, -16);
  t.rail(0.45, ...arc(2, -16, 1.6, -20, 200));
  t.rail(0.45, [-6, 0, -9], [-3.5, 0, -9]);
  t.disc('strokes', -5, -10.6, 0.5, 0, { add: -1 }, { once: true });
  return t.tee(-2, 0, -1);
};
