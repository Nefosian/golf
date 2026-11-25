import { hole, roundRect, entry } from '../lib.mjs';

// La Lune (show, par 3), at a third of the gravity: everything floats. A runway, a booster and a kicker
// over a ravine; past it, a crater with the cup at its bottom: a ball flies far and slowly, and lands in
// the crater or short of it, in the void. Safe: the long way round the east side, a meteor sliding
// across it, into the crater from the side. The coin on the crater's far rim.
export default () => {
  const t = hole('La Lune', { theme: 'galaxie', par: 3, gravity: 6 });
  const [cx, cz, r1, collar] = [0, -26, 6, 1], top = 1.7;
  t.plate(roundRect(-5, -3, 5, 3, 1.5), 2, { open: [[0, -3, 5], [5, 0, 4]] });
  t.path([0, 2, -3], [0, -1], { width: 5 }).straight(5).straight(2, { rise: 0.5, ease: false }).done({ open: 'end' }); // the kicker
  t.pad('speedpad', -2.5, -6.6, 2.5, -5.4, 2, { dir: [0, 0, -1], speed: 10 });
  t.path([5, 2, 0], [1, 0], { width: 4 }).straight(2).turn(90, 3).straight(20, { rise: top - 2 }).turn(90, 3).reach(cx, cz, r1 + collar, { stop: r1 + 0.05 }).done();
  t.slider(8.3, -13.4, 9.1, -12.6, 1.87, 0.5, [3.4, 0], { period: 3.4 }); // the meteor
  t.bowl(cx, cz, top - 1.2, 2, r1, 1.2, { collar, cup: true, open: [[cx, cz + r1 + collar, 6], entry(cx, cz, r1 + collar, 20, cz, 4)] });
  t.disc('strokes', cx, cz - r1 - collar / 2, 0.45, top, { add: -1 }, { once: true });
  return t.tee(0, 2, 1.5);
};
