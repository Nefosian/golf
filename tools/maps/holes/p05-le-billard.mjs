import { hole, roundRect, arc } from '../lib.mjs';

// Le Billard (easy, par 2): a big table with rounded corners, nothing but cushions. The cup sits behind
// a curved screen open to the back: it takes the back cushion to get in. The coin hides behind a stub of
// cushion on the left: two cushions. The left cushion is a bumper (the back one was too: a ball got
// caught between it and the corner):
// they kick a ball back at 9 u/s, whatever its speed. Readable, short; balls cross on the rebounds.
export default () => {
  const t = hole('Le Billard', { theme: 'ville', par: 2 });
  t.green(roundRect(-6, -20, 6, 2, 2.5), 0, 2, -16);
  t.rail(0.45, ...arc(2, -16, 1.6, -20, 200));
  t.rail(0.45, [-6, 0, -9], [-3.5, 0, -9]);
  t.rail(0.45, [-5.7, 0, -1], [-5.7, 0, -8.6], 'bumper').rail(0.45, [-5.7, 0, -9.4], [-5.7, 0, -14], 'bumper'); // left, either side of the stub
  t.disc('strokes', -5, -10.6, 0.5, 0, { add: -1 }, { once: true });
  return t.tee(-2, 0, -1);
};
